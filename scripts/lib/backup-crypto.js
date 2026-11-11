const crypto=require('node:crypto');
const MAGIC=Buffer.from('MAPLEBK1');
const MAX_BYTES=256*1024*1024;

function seal(archive,metadata,key){
    if(key.length!==32 || archive.length>MAX_BYTES)throw Error('Invalid backup size or key');
    const header=Buffer.from(JSON.stringify(metadata));
    if(header.length>65536)throw Error('Backup metadata too large');
    const size=Buffer.alloc(4);size.writeUInt32BE(header.length);
    const iv=crypto.randomBytes(12),aad=Buffer.concat([MAGIC,size,header]);
    const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad);
    const encrypted=Buffer.concat([cipher.update(archive),cipher.final()]);
    return Buffer.concat([aad,iv,encrypted,cipher.getAuthTag()]);
}

function unseal(file,key){
    if(key.length!==32 || file.length<40 || file.length>MAX_BYTES+65580 || !file.subarray(0,8).equals(MAGIC))throw Error('Invalid backup');
    const length=file.readUInt32BE(8),end=12+length;
    if(length>65536 || file.length<end+28)throw Error('Invalid backup header');
    const decipher=crypto.createDecipheriv('aes-256-gcm',key,file.subarray(end,end+12));
    decipher.setAAD(file.subarray(0,end));decipher.setAuthTag(file.subarray(-16));
    // Authenticate in memory before any restore process receives data.
    const archive=Buffer.concat([decipher.update(file.subarray(end+12,-16)),decipher.final()]);
    return {archive,metadata:JSON.parse(file.subarray(12,end).toString('utf8'))};
}
module.exports={seal,unseal,MAX_BYTES};
