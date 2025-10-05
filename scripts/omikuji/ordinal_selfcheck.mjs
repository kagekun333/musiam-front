const tens = {20:"Twenty",30:"Thirty",40:"Forty",50:"Fifty",60:"Sixty",70:"Seventy",80:"Eighty",90:"Ninety"};
const suf  = {1:"First",2:"Second",3:"Third",4:"Fourth",5:"Fifth",6:"Sixth",7:"Seventh",8:"Eighth",9:"Ninth"};
function toOrdinal(n){
  const base=["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"];
  if(n<=10) return base[n];
  const teen={11:"Eleven",12:"Twelve",13:"Thirteen",14:"Fourteen",15:"Fifteen",16:"Sixteen",17:"Seventeen",18:"Eighteen",19:"Nineteen"};
  if(teen[n]) return teen[n];
  const t=Math.floor(n/10)*10, o=n%10; if(o===0) return tens[t];
  return `${tens[t]}-${suf[o]}`;
}
for (const t of [20,30,40,50,60,70,80,90]){
  for (let o=1;o<=9;o++){
    const n=t+o, got=toOrdinal(n), expect=`${tens[t]}-${suf[o]}`;
    if(got!==expect) { console.error(`Ordinal fail: ${n} -> ${got} (expect ${expect})`); process.exit(1); }
  }
}
console.log("[ordinal] self-check PASS");