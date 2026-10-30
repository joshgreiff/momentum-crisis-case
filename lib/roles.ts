import type {Role} from './schemas';

export const EXECUTIVES:Record<Role,{name:string;title:string;area:string;focus:string}>={
 CEO:{name:'Sam Bennet',title:'Chief Executive Officer',area:'Overall strategy',focus:'Overall strategy and priorities, Momentum\'s people-first and safety values, governance and accountability to the Board (chair Margie Simpson), coordination of the executive team, and the timing and tone of leadership\'s response.'},
 'Globex President':{name:'Brian Chambers',title:'President & CEO of Globex (also CIO)',area:'Technology',focus:'Autonomous-vehicle technology and software, root-cause investigation, cybersecurity and data-exposure hypotheses, evidence preservation, technical controls over the fleet, and technical training.'},
 COO:{name:'Maria Mason',title:'Chief Operating Officer',area:'Operations',focus:'Daily operations, driver and public road safety, the convoy operating model (one human-driven lead truck with three autonomous followers), fleet continuity, contingency capacity, and delivery commitments to customers.'},
 CFO:{name:'Susan Bucks',title:'Chief Financial Officer',area:'Finance',focus:'Financial exposure, costs, liquidity, contractual and liability risk, insurance, investor and stock impact, and risk controls. Describe scenarios qualitatively unless figures are provided; never fabricate numbers.'},
 CMO:{name:'Aishwarya Rowe',title:'Chief Marketing Officer',area:'Communications',focus:'Stakeholder mapping, reputation (empathy and competence), media dynamics, consistent messaging across channels, and draft communications for human review.'},
 CHRO:{name:'Rubin Oscar',title:'Chief Human Resources Officer',area:'People and HR',focus:'Employees and drivers, workforce safety and wellbeing, morale, the pending layoff decision and training program, the Etna community, and internal communications.'},
};
