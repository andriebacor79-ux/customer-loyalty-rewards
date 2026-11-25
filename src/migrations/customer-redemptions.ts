import 'reflect-metadata';
import 'dotenv/config';
import {DataSource} from 'typeorm';
import {databaseOptions} from '../database';
async function main(){
 const db=await new DataSource(databaseOptions()).initialize();
 try{
  const [column]=await db.query("SELECT IS_NULLABLE,DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='PointsTransaction' AND COLUMN_NAME='EmployeeID'");
  if(!column||column.DATA_TYPE!=='int')throw new Error('Expected loyalty schema not found; refusing migration');
  if(column.IS_NULLABLE==='NO'){
   // No rows or foreign keys are removed. Existing staff attributions are preserved.
   await db.query('ALTER TABLE `PointsTransaction` MODIFY COLUMN `EmployeeID` int NULL');
   console.log('Customer redemption migration applied; existing history preserved');
  }
 }finally{await db.destroy();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
