import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {inflateRawSync} from 'node:zlib';

export type KnowledgeSource={name:string;kind:'Case document'|'Lecture transcript'|'Exhibit document';text:string};
export type Knowledge={sources:KnowledgeSource[];prompt:string};

const MAX_SOURCE_CHARS=60_000;
const cache=new Map<string,Promise<Knowledge>>();

export function knowledgeDir(){return path.join(process.cwd(),'knowledge')}

export function loadKnowledge(dir=knowledgeDir()):Promise<Knowledge>{
 let pending=cache.get(dir);
 if(!pending){pending=readKnowledge(dir);cache.set(dir,pending);pending.catch(()=>cache.delete(dir))}
 return pending;
}

async function readKnowledge(dir:string):Promise<Knowledge>{
 const names=(await readdir(dir)).filter(n=>/\.(md|txt|docx)$/i.test(n)).sort((a,b)=>a.localeCompare(b));
 const sources:KnowledgeSource[]=[];
 for(const name of names){
  const file=path.join(dir,name);
  const raw=name.toLowerCase().endsWith('.docx')?docxText(await readFile(file)):await readFile(file,'utf8');
  const text=clean(raw).slice(0,MAX_SOURCE_CHARS);
  if(text)sources.push({name,kind:kindOf(name),text});
 }
 if(!sources.length)throw new Error(`No knowledge sources found in ${dir}`);
 const prompt=sources.map(s=>`=== SOURCE: "${s.name}" (${s.kind}) ===\n${s.text}\n=== END SOURCE: "${s.name}" ===`).join('\n\n');
 return {sources,prompt};
}

function kindOf(name:string):KnowledgeSource['kind']{
 if(/transcript/i.test(name))return 'Lecture transcript';
 if(/\.docx$|diagram/i.test(name))return 'Exhibit document';
 return 'Case document';
}

function clean(text:string){
 return text.replace(/\r\n/g,'\n').replace(/^\[(Music|Various News Reports)\]\s*$/gim,'').replace(/\n{3,}/g,'\n\n').trim();
}

export function docxText(buf:Buffer):string{
 const xml=readZipEntry(buf,'word/document.xml');
 if(!xml)throw new Error('DOCX has no word/document.xml');
 const images=countZipEntries(buf,/^word\/media\//);
 const text=xml.toString('utf8')
  .replace(/<w:tab\/>/g,'\t').replace(/<w:br\/>/g,'\n').replace(/<\/w:p>/g,'\n')
  .replace(/<[^>]+>/g,'')
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(Number(d)))
  .replace(/&amp;/g,'&')
  .split('\n').map(l=>l.trim()).filter(l=>l&&!/^\d+$/.test(l)).join('\n');
 return images?`${text}\n[This document also contains ${images} embedded image(s); see any accompanying transcription source.]`:text;
}

type ZipEntry={name:string;method:number;compressedSize:number;localOffset:number};

function zipEntries(buf:Buffer):ZipEntry[]{
 let eocd=-1;
 for(let i=buf.length-22;i>=Math.max(0,buf.length-65_557);i--)if(buf.readUInt32LE(i)===0x06054b50){eocd=i;break}
 if(eocd<0)throw new Error('Not a valid zip/docx file');
 const count=buf.readUInt16LE(eocd+10);
 let p=buf.readUInt32LE(eocd+16);
 const entries:ZipEntry[]=[];
 for(let n=0;n<count;n++){
  if(buf.readUInt32LE(p)!==0x02014b50)throw new Error('Corrupt zip central directory');
  const nameLen=buf.readUInt16LE(p+28),extraLen=buf.readUInt16LE(p+30),commentLen=buf.readUInt16LE(p+32);
  entries.push({name:buf.toString('utf8',p+46,p+46+nameLen),method:buf.readUInt16LE(p+10),compressedSize:buf.readUInt32LE(p+20),localOffset:buf.readUInt32LE(p+42)});
  p+=46+nameLen+extraLen+commentLen;
 }
 return entries;
}

function readZipEntry(buf:Buffer,name:string):Buffer|null{
 const entry=zipEntries(buf).find(e=>e.name===name);
 if(!entry)return null;
 const o=entry.localOffset,start=o+30+buf.readUInt16LE(o+26)+buf.readUInt16LE(o+28);
 const data=buf.subarray(start,start+entry.compressedSize);
 if(entry.method===0)return data;
 if(entry.method===8)return inflateRawSync(data);
 throw new Error(`Unsupported zip compression method ${entry.method}`);
}

function countZipEntries(buf:Buffer,pattern:RegExp){return zipEntries(buf).filter(e=>pattern.test(e.name)).length}
