import {mkdirSync,readFileSync,writeFileSync,renameSync,readdirSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import {snapshotSchema,taskStateSchema} from './contracts.js';
const recordSchema=z.object({task:z.string().max(2000),snapshot:snapshotSchema,history:z.array(z.string()).max(12),state:taskStateSchema,workflowRunId:z.string(),events:z.array(z.string()).max(500),touched:z.number()}).strict();
export type StoredTask=z.infer<typeof recordSchema>;
export class TaskRepository{
 constructor(private directory:string){mkdirSync(directory,{recursive:true,mode:0o700});}
 load():StoredTask[]{
  return readdirSync(this.directory).filter(name=>/^[a-f0-9-]+\.json$/.test(name)).flatMap(name=>{
   const record=recordSchema.parse(JSON.parse(readFileSync(join(this.directory,name),'utf8')));
   if(Date.now()-record.touched>3600000){unlinkSync(join(this.directory,name));return[];}return[record];
  });
 }
 save(raw:StoredTask){const record=recordSchema.parse(raw);if(!/^[a-f0-9-]+$/.test(record.state.runId))throw new Error('Invalid run ID');const file=join(this.directory,record.state.runId+'.json');writeFileSync(file+'.tmp',JSON.stringify(record),{mode:0o600});renameSync(file+'.tmp',file);}
}
