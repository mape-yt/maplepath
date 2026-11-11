const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {seal,unseal}=require('../scripts/lib/backup-crypto');
test('backup encryption authenticates contents and metadata before restore',()=>{
    const key=crypto.randomBytes(32),data=Buffer.from('synthetic private database contents'),metadata={format:1,database:'test',collections:{}};
    const encrypted=seal(data,metadata,key);
    assert.equal(encrypted.includes(data),false);
    assert.deepEqual(unseal(encrypted,key),{archive:data,metadata});
    assert.notDeepEqual(seal(data,metadata,key),encrypted,'fresh nonce for every archive');
    for(const position of [0,9,15,encrypted.length-20,encrypted.length-1]){
        const broken=Buffer.from(encrypted);broken[position]^=1;assert.throws(()=>unseal(broken,key));
    }
    assert.throws(()=>unseal(encrypted,crypto.randomBytes(32)));
    assert.throws(()=>unseal(encrypted.subarray(0,15),key));
});
