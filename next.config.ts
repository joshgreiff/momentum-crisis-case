import type {NextConfig} from 'next';

const config:NextConfig={
 devIndicators:false,
 // The agents read knowledge/ at runtime; include it in the serverless bundle that runs the analysis.
 outputFileTracingIncludes:{'/api/events/[id]/process':['./knowledge/**/*'],'/api/events/[id]/questions':['./knowledge/**/*']},
};
export default config;
