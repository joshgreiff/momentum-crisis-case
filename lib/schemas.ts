import {z} from 'zod';

// Field constraints are kept to what OpenAI strict structured outputs accept: every field required, no optionals.
export const ROLES=['CEO','Globex President','COO','CFO','CMO','CHRO'] as const;
export type Role=typeof ROLES[number];

const level=z.enum(['low','medium','high']);

export const ExtractionSchema=z.object({
 confirmed_facts:z.array(z.string()).describe('Facts explicitly stated in the crisis update. No inference.'),
 assumptions:z.array(z.string()).describe('Reasonable but unconfirmed interpretations, each marked as an assumption.'),
 urgency:z.enum(['low','medium','high','critical','unknown']),
});
export type Extraction=z.infer<typeof ExtractionSchema>;

export const AgentAnalysisSchema=z.object({
 headline:z.string().describe('One-sentence assessment from this executive\'s perspective.'),
 confirmed_facts:z.array(z.object({fact:z.string(),source:z.string().describe('"Crisis update", a prior update subject, or a source library file name.')})),
 case_connections:z.array(z.object({source:z.string().describe('Exact source library file name.'),point:z.string().describe('Relevant case precedent, convoy-model detail, or lecture principle, and how it applies here.')})),
 assumptions:z.array(z.string()),
 risks:z.array(z.object({risk:z.string(),likelihood:level,impact:level,mitigation:z.string()})),
 stakeholder_impacts:z.array(z.object({stakeholder:z.string(),impact:z.string(),severity:level})),
 recommendations:z.array(z.object({action:z.string(),rationale:z.string(),priority:z.enum(['immediate','short_term','long_term'])})),
 open_questions:z.array(z.string()),
});
export type AgentAnalysis=z.infer<typeof AgentAnalysisSchema>;

export const DecisionDetailsSchema=z.object({
 situation_brief:z.string().describe('2-3 plain sentences: what happened and why it matters. Confirmed facts only; name key uncertainties as uncertain.'),
 recommendation_summary:z.string().describe('1-2 sentences summarizing the recommended course of action.'),
 alternatives_considered:z.array(z.object({option:z.string(),tradeoff:z.string().describe('Why it was not the recommended course.')})),
 immediate_actions:z.array(z.object({action:z.string(),owner:z.enum(ROLES),timeframe:z.string()})),
 tradeoffs:z.array(z.string()),
 key_risks:z.array(z.string()),
 dissenting_views:z.array(z.object({role:z.enum(ROLES),concern:z.string()})),
 draft_communications:z.array(z.object({audience:z.string(),key_message:z.string()})).describe('Drafts for human review only; never sent.'),
 information_needed:z.array(z.string()),
 confidence:level,
});
export const DecisionSchema=DecisionDetailsSchema.extend({
 title:z.string(),
 proposal:z.string().describe('The single decision the CEO recommends the team approve.'),
 rationale:z.string(),
});
export type Decision=z.infer<typeof DecisionSchema>;

// Display-only variants: tolerate rows saved before newer fields were added.
export const AgentAnalysisDisplaySchema=AgentAnalysisSchema.extend({case_connections:AgentAnalysisSchema.shape.case_connections.default([])});
export const DecisionDetailsDisplaySchema=DecisionDetailsSchema.extend({
 alternatives_considered:DecisionDetailsSchema.shape.alternatives_considered.default([]),
 situation_brief:z.string().default(''),
 recommendation_summary:z.string().default(''),
});
export type AgentAnalysisDisplay=z.infer<typeof AgentAnalysisDisplaySchema>;
export type DecisionDetailsDisplay=z.infer<typeof DecisionDetailsDisplaySchema>;
export type DecisionDetails=z.infer<typeof DecisionDetailsSchema>;
