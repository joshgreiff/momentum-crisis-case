import type {Role} from './schemas';

export const TEAM={label:'Petitto / Team #6 / 2:15',course:'BUSMHR 2292 crisis simulation',dates:'Oct 30 – Nov 6, 2026'};

/** Student executive assigned to each simulated role (display only; not sent to the model). */
export const ASSIGNMENTS:Record<Role,{student:string;title:string}>={
 CEO:{student:'Josh Greiff',title:'Momentum CEO'},
 'Globex President':{student:'Mateo Del Toro',title:'Globex CEO'},
 COO:{student:'Aman Chugh',title:'COO'},
 CFO:{student:'Griffin Lewis',title:'CFO'},
 CMO:{student:'Mikey Campbell',title:'CMO'},
 CHRO:{student:'Emily Tang',title:'CHRO'},
};
