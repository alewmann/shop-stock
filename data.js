/* Default catalog — owner can rename, add sizes, or change prices/thresholds in Settings */
const DEFAULT_ITEMS = [
  { id:'tshirt-oval',   name:'T-Shirt / ቲሸርት',                      icon:'tshirt',  color:['#DCEBF5','#B9D6EA'], sellPrice:450,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'tshirt-koleta', name:'Collared / Polo shirt / ባለ ኮሌታ ቲሸርት', icon:'tshirt',  color:['#E3EEF7','#C3DCEC'], sellPrice:480,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'shirt',   name:'Shirt / ሸሚዝ',      icon:'shirt',   color:['#DCE3EC','#B8C6D9'], sellPrice:600,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'trouser', name:'Trousers / ሱሪ',    icon:'trouser', color:['#D9E0E8','#AEBBCB'], sellPrice:700,  sizes:['30','32','34','36','38','40'] },
  { id:'sweater', name:'Sweater / ሹራብ',    icon:'sweater', color:['#E1E2EC','#C2C5DC'], sellPrice:850,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'coat',    name:'Jacket / ጃኬት',     icon:'coat',    color:['#D3E1EA','#A9C2D3'], sellPrice:1800, sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'shoe',    name:'Shoes / ጫማ',       icon:'shoe',    color:['#E0E5EA','#BFC9D3'], sellPrice:1200, sizes:['40','41','42','43','44','45'] }
];
const DEFAULT_THRESHOLD = 5;

