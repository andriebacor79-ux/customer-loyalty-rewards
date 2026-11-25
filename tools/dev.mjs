import 'dotenv/config';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
const children=[];
const start=(cmd,args,options={})=>{const p=spawn(cmd,args,{stdio:'inherit',env:process.env,...options});children.push(p);p.on('exit',code=>{if(code)console.error(`Development process exited with ${code}`);});return p;};
// Optional local QA database. Not used by deployed services or normal users.
if(process.env.DEV_MYSQL_BINARY){
 start(process.env.DEV_MYSQL_BINARY,['--no-defaults',`--basedir=${process.env.DEV_MYSQL_BASEDIR}`,`--datadir=${process.env.DEV_MYSQL_DATADIR}`,'--socket=',`--port=${process.env.DB_PORT??3307}`,'--bind-address=127.0.0.1','--mysqlx=OFF',`--pid-file=${process.env.DEV_MYSQL_DATADIR}/preview.pid`,`--log-error=${process.env.DEV_MYSQL_DATADIR}/preview.log`],{env:{...process.env,LD_LIBRARY_PATH:process.env.DEV_MYSQL_LIBS}});
 const {default:mysql}=await import('mysql2/promise');let connected=false;for(let i=0;i<30;i++){try{const c=await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD});await c.end();connected=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}if(!connected)throw new Error('Local QA database did not start');
}
if(!existsSync('web/dist/index.html'))throw new Error('Run npm run build first.');
start(process.execPath,['dist/main.js'],{env:{...process.env,HOST:'0.0.0.0'}});
const stop=()=>{for(const p of children)p.kill();process.exit(0);};process.on('SIGTERM',stop);process.on('SIGINT',stop);
