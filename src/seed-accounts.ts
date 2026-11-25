import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { hash } from 'bcryptjs';
import { databaseOptions } from './database';
import { Customer, Employee,LoyaltyAccount,EmailNotification } from './entities';
async function main(){const db=await new DataSource(databaseOptions()).initialize();try{
 const definitions=[{role:'Manager',email:process.env.MANAGER_EMAIL??'andriebacor194@gmail.com',password:process.env.MANAGER_PASSWORD},{role:'Staff',email:process.env.STAFF_EMAIL??'andriebacor79@gmail.com',password:process.env.STAFF_PASSWORD},{role:'Customer',email:process.env.CUSTOMER_EMAIL??'bebekosijazmin021@gmail.com',password:process.env.CUSTOMER_PASSWORD}];
 for(const d of definitions){if(!d.password||d.password.length<12||d.password.length>72||!/^[\x20-\x7E]+$/.test(d.password))throw new Error(`Configure ${d.role.toUpperCase()}_PASSWORD (12-72 ASCII characters)`);}
 for(const d of definitions){await db.transaction(async m=>{
  const email=d.email.toLowerCase();
  if(d.role==='Customer'){
   if(await m.existsBy(Customer,{email})){console.log('Existing customer preserved');return;}
   const c=await m.save(Customer,m.create(Customer,{firstName:'Demo',lastName:'Member',email,passwordHash:await hash(d.password!,12)}));
   await m.save(LoyaltyAccount,m.create(LoyaltyAccount,{customerId:c.customerId,pointsBalance:0,accountStatus:'Active'}));
   await m.save(EmailNotification,m.create(EmailNotification,{customerId:c.customerId,employeeId:null,notificationType:'AccountUpdate',subject:'Welcome to Perkwise',message:'Your loyalty account is ready. Earn one point for every PHP10 purchase.',dateSent:null,deliveryStatus:'Pending'}));
  }else{
   if(await m.existsBy(Employee,{email})){console.log(`Existing ${d.role} preserved`);return;}
   await m.save(Employee,m.create(Employee,{firstName:'Andrie',lastName:d.role==='Manager'?'Bacor':'Bacor (Staff)',email,passwordHash:await hash(d.password!,12),role:d.role as 'Manager'|'Staff',dateHired:new Date().toISOString().slice(0,10)}));
  }
  console.log(`${d.role} account ready; password not printed`);
 });}
 }finally{await db.destroy();}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
