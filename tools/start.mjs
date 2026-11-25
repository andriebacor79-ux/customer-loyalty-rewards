import 'dotenv/config';
import { spawn } from 'node:child_process';
import mysql from 'mysql2/promise';
const run=(file)=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{stdio:'inherit',env:process.env});p.on('exit',code=>code===0?resolve():reject(new Error(`${file} failed`)));});
if(process.env.INIT_DATABASE==='true'){
 const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,...(process.env.DB_SSL==='true'?{ssl:{rejectUnauthorized:true,...(process.env.DB_CA_CERT?{ca:process.env.DB_CA_CERT.replace(/\\n/g,'\n')}:{})}}:{})});
 const [rows]=await db.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('Customer','Employee','LoyaltyAccount','PointsTransaction','Reward','Redemption','EmailNotification')");await db.end();
 if(rows.length===0)await run('dist/setup.js');else if(rows.length!==7)throw new Error('Partial schema detected; initialize the database manually before deploying.');
 if(process.env.STAFF_PASSWORD&&process.env.CUSTOMER_PASSWORD)await run('dist/seed-accounts.js');
}
await run('dist/migrations/customer-redemptions.js');
await run('dist/main.js');
