import { Module, Injectable, Controller, Get, Query, Req } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Customer,Employee,LoyaltyAccount,PointsTransaction,Reward,Redemption,EmailNotification } from '../entities';
import { ListDto,page } from '../dto';
import { Actor,Roles,Public } from '../common/security';
@Injectable()
class DashboardService {
 constructor(private db:DataSource){}
 async profile(actor:Actor){
  if(actor.type==='customer'){
   const profile=await this.db.getRepository(Customer).findOneByOrFail({customerId:actor.id});
   const account=await this.db.getRepository(LoyaltyAccount).findOneByOrFail({customerId:actor.id});
   return {...actor,firstName:profile.firstName,lastName:profile.lastName,phoneNumber:profile.phoneNumber,birthDate:profile.birthDate,dateRegistered:profile.dateRegistered,account};
  }
  const profile=await this.db.getRepository(Employee).findOneByOrFail({employeeId:actor.id});return {...actor,firstName:profile.firstName,lastName:profile.lastName,dateHired:profile.dateHired};
 }
 private ledger(actor:Actor){const b=this.db.getRepository(PointsTransaction).createQueryBuilder('t').innerJoin('t.account','a').innerJoin('a.customer','c');if(actor.role==='customer')b.where('c.customerId=:owner',{owner:actor.id});return b;}
 async overview(actor:Actor){
  const profile=await this.profile(actor);const since=new Date();since.setUTCHours(0,0,0,0);since.setUTCDate(since.getUTCDate()-6);
  const graph=await this.ledger(actor).select('DATE(t.transactionDate)','day').addSelect("SUM(CASE WHEN t.transactionType='Earn' THEN t.points ELSE 0 END)",'earned').addSelect("SUM(CASE WHEN t.transactionType='Redeem' THEN ABS(t.points) ELSE 0 END)",'redeemed').andWhere('t.transactionDate>=:since',{since}).groupBy('DATE(t.transactionDate)').orderBy('day','ASC').getRawMany();
  const days=Array.from({length:7},(_,i)=>{const d=new Date(since);d.setUTCDate(d.getUTCDate()+i);const key=d.toISOString().slice(0,10);const r=graph.find(r=>(r.day instanceof Date?r.day.toISOString().slice(0,10):String(r.day).slice(0,10))===key);return {date:key,label:d.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'}),earned:Number(r?.earned??0),redeemed:Number(r?.redeemed??0)};});
  const aggregate=await this.ledger(actor).select("COALESCE(SUM(CASE WHEN t.transactionType='Earn' THEN t.points ELSE 0 END),0)",'earned').addSelect("COALESCE(SUM(CASE WHEN t.transactionType='Redeem' THEN ABS(t.points) ELSE 0 END),0)",'redeemed').addSelect("COALESCE(SUM(t.purchaseAmount),0)",'purchaseTotal').getRawOne();
  const recent=await this.transactions({page:'1',limit:'6'},actor);
  let customers=0,activeAccounts=0,pendingEmails=0;
  if(actor.role!=='customer'){
   [customers,activeAccounts]=await Promise.all([this.db.getRepository(Customer).count(),this.db.getRepository(LoyaltyAccount).countBy({accountStatus:'Active'})]);
   if(actor.role==='manager')pendingEmails=await this.db.getRepository(EmailNotification).countBy({deliveryStatus:'Pending'});
  }
  const rb=this.db.getRepository(Redemption).createQueryBuilder('r').innerJoin('r.transaction','t').innerJoin('t.account','a');if(actor.role==='customer')rb.where('a.customerId=:owner',{owner:actor.id});
  const [redemptionCount,pendingRedemptions,availableRewards,lowStock]=await Promise.all([rb.clone().getCount(),rb.clone().andWhere('r.redemptionStatus=:status',{status:'Pending'}).getCount(),this.db.getRepository(Reward).countBy({rewardStatus:'Available'}),this.db.getRepository(Reward).createQueryBuilder('r').where('r.stockQuantity<=r.reorderLevel').getCount()]);
  return {profile,stats:{customers,activeAccounts,pointsEarned:Number(aggregate.earned),pointsRedeemed:Number(aggregate.redeemed),purchaseTotal:Number(aggregate.purchaseTotal),redemptions:redemptionCount,pendingRedemptions,availableRewards,lowStock,pendingEmails},chart:days,recent:recent.data};
 }
 async customers(q:ListDto){const {page:pg,limit}=page(q);const b=this.db.getRepository(Customer).createQueryBuilder('c').leftJoin('c.account','a');
  if(q.search)b.andWhere('(c.firstName LIKE :search OR c.lastName LIKE :search OR c.email LIKE :search)',{search:'%'+q.search+'%'});
  if(q.accountStatus)b.andWhere('a.accountStatus=:status',{status:q.accountStatus});
  const totalItems=await b.getCount();const data=await b.select(['c.customerId AS customerId','c.firstName AS firstName','c.lastName AS lastName','c.email AS email','c.phoneNumber AS phoneNumber','c.birthDate AS birthDate','c.dateRegistered AS dateRegistered','a.accountId AS accountId','a.pointsBalance AS pointsBalance','a.accountStatus AS accountStatus']).orderBy('c.customerId','DESC').offset((pg-1)*limit).limit(limit).getRawMany();return {page:pg,limit,totalItems,data};
 }
 async transactions(q:ListDto,actor:Actor){const {page:pg,limit}=page(q);const b=this.ledger(actor);
  if(q.transactionType)b.andWhere('t.transactionType=:kind',{kind:q.transactionType});
  if(q.search)b.andWhere('(c.firstName LIKE :search OR c.lastName LIKE :search OR c.email LIKE :search)',{search:'%'+q.search+'%'});
  const totalItems=await b.getCount();const data=await b.select(['t.transactionId AS transactionId','t.accountId AS accountId','t.transactionType AS transactionType','t.points AS points','t.purchaseAmount AS purchaseAmount','t.transactionDate AS transactionDate','c.firstName AS firstName','c.lastName AS lastName','c.customerId AS customerId','c.email AS email']).orderBy('t.transactionId','DESC').offset((pg-1)*limit).limit(limit).getRawMany();return {page:pg,limit,totalItems,data:data.map(r=>({...r,points:Number(r.points),purchaseAmount:r.purchaseAmount===null?null:Number(r.purchaseAmount)}))};
 }
 async redemptions(q:ListDto,actor:Actor){const {page:pg,limit}=page(q);const b=this.db.getRepository(Redemption).createQueryBuilder('r').innerJoin('r.transaction','t').innerJoin('t.account','a').innerJoin('a.customer','c').innerJoin('r.reward','w');
  if(actor.role==='customer')b.where('c.customerId=:owner',{owner:actor.id});
  if(q.redemptionStatus)b.andWhere('r.redemptionStatus=:status',{status:q.redemptionStatus});
  if(q.search){const reference=/^(?:PW-)?([0-9]{1,10})$/i.exec(q.search.trim());b.andWhere('(c.firstName LIKE :term OR c.lastName LIKE :term OR w.rewardName LIKE :term OR r.redemptionId=:reference)',{term:'%'+q.search+'%',reference:reference?Number(reference[1]):0});}
  const totalItems=await b.getCount();const data=await b.select(['r.redemptionId AS redemptionId','r.transactionId AS transactionId','r.rewardId AS rewardId','r.dateRedeemed AS dateRedeemed','r.redemptionStatus AS redemptionStatus','w.rewardName AS rewardName','c.firstName AS firstName','c.lastName AS lastName','a.accountId AS accountId','t.points AS points']).orderBy('r.redemptionId','DESC').offset((pg-1)*limit).limit(limit).getRawMany();return {page:pg,limit,totalItems,data};
 }
}
@Controller('dashboard')
class DashboardController {
 constructor(private service:DashboardService){}
 @Get('profile') profile(@Req() r:any){return this.service.profile(r.user);}
 @Get('overview') overview(@Req() r:any){return this.service.overview(r.user);}
 @Roles('staff','manager') @Get('customers') customers(@Query() q:ListDto){return this.service.customers(q);}
 @Get('transactions') transactions(@Query() q:ListDto,@Req() r:any){return this.service.transactions(q,r.user);}
 @Get('redemptions') redemptions(@Query() q:ListDto,@Req() r:any){return this.service.redemptions(q,r.user);}
}
@Controller()
class HealthController {
 constructor(private db:DataSource){}
 @Public() @Get('health') async health(){await this.db.query('SELECT 1');return {status:'ok',service:'Perkwise',version:'3.0.0'};}
}
@Module({controllers:[DashboardController,HealthController],providers:[DashboardService]})
export class DashboardModule {}
