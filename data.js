/* Default catalog — owner can rename, add sizes, or change prices/thresholds in Settings */
const STORAGE_KEY = 'shopstock_v1';

const DEFAULT_ITEMS = [
  { id:'tshirt',  name:'T-shirt',  icon:'tshirt',  color:['#EFE6D0','#E2D3A8'], sellPrice:450,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'shirt',   name:'Shirt',    icon:'shirt',   color:['#DCE7E4','#BFD8D1'], sellPrice:600,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'trouser', name:'Trouser',  icon:'trouser', color:['#E9DCD3','#D9C1AF'], sellPrice:700,  sizes:['30','32','34','36','38','40'] },
  { id:'sweater', name:'Sweater',  icon:'sweater', color:['#EADEE3','#D9C2CB'], sellPrice:850,  sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'coat',    name:'Coat',     icon:'coat',    color:['#DCE6E7','#B9CFD1'], sellPrice:1800, sizes:['S','M','L','XL','XXL','XXXL'] },
  { id:'shoe',    name:'Shoe',     icon:'shoe',    color:['#E7DFCC','#D6C79E'], sellPrice:1200, sizes:['40','41','42','43','44','45'] }
];
const DEFAULT_THRESHOLD = 5;

function buildDefaultState(){
  const items = DEFAULT_ITEMS.map(def => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    color: def.color,
    sizes: def.sizes.map(label => ({
      id: def.id + '-' + label,
      label,
      sellPrice: def.sellPrice,
      qty: 0,
      threshold: DEFAULT_THRESHOLD
    }))
  }));
  return { items, transactions: [], barcodeMap: {} };
}

const Store = {
  load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return buildDefaultState();
      const parsed = JSON.parse(raw);
      if(!parsed.items || !parsed.transactions) return buildDefaultState();
      if(!parsed.barcodeMap) parsed.barcodeMap = {};
      // keep icon/name in sync with current defaults without touching stock data
      parsed.items.forEach(item => {
        const def = DEFAULT_ITEMS.find(d => d.id === item.id);
        if(def){ item.icon = def.icon; item.name = def.name; item.color = def.color; }
      });
      return parsed;
    }catch(e){
      return buildDefaultState();
    }
  },
  save(state){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    }catch(e){
      return false;
    }
  }
};
