/* Default catalog — owner can rename, add sizes, or change prices/thresholds in Settings */
const DEFAULT_ITEMS = [
  { id:'tshirt-oval',   name:'T-Shirt / ቲሸርት',                      icon:'tshirt',  color:['#EFE6D0','#E2D3A8'], sellPrice:450,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'tshirt-koleta', name:'Collared / Polo shirt / ባለ ኮሌታ ቲሸርት', icon:'tshirt',  color:['#F1EAD9','#E7D9B9'], sellPrice:480,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'shirt',   name:'Shirt / ሸሚዝ',      icon:'shirt',   color:['#DCE7E4','#BFD8D1'], sellPrice:600,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'trouser', name:'Trousers / ሱሪ',    icon:'trouser', color:['#E9DCD3','#D9C1AF'], sellPrice:700,  sizes:['30','32','34','36','38','40'] },
  { id:'sweater', name:'Sweater / ሹራብ',    icon:'sweater', color:['#EADEE3','#D9C2CB'], sellPrice:850,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'coat',    name:'Jacket / ጃኬት',     icon:'coat',    color:['#DCE6E7','#B9CFD1'], sellPrice:1800, sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'shoe',    name:'Shoes / ጫማ',       icon:'shoe',    color:['#E7DFCC','#D6C79E'], sellPrice:1200, sizes:['40','41','42','43','44','45'] }
];
const DEFAULT_THRESHOLD = 5;

