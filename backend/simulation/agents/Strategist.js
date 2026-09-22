  import { Agent } from '@mariozechner/pi-agent-core';                                                                                                   
   import { streamSimple } from '@mariozechner/pi-ai';                                                                                                    
   import fs from 'fs/promises';                                                                                                                          
   import path from 'path';                                                                                                                               
   import { fileURLToPath } from 'url';                                                                                                                   
                                                                                                                                                          
   const __filename = fileURLToPath(import.meta.url);                                                                                                     
   const __dirname = path.dirname(__filename);                                                                                                            
   const WEIGHTS_PATH = path.join(__dirname, '../config/weights.json');                                                                                   
                                                                                                                                                          
   // Reusing model config                                                                                                                                
   const gemmaCloudModel = {                                                                                                                              
     id: process.env.OLLAMA_MODEL || 'gemma4:31b',                                                                                                        
     name: 'Gemma 4 Cloud Engine',                                                                                                                        
     api: 'openai-completions',                                                                                                                           
     provider: 'ollama-cloud',                                                                                                                            
     baseUrl: 'https://ollama.com/v1',                                                                                                                    
     reasoning: true,                                                                                                                                     
     input: ['text'],                                                                                                                                     
     contextWindow: 256000,                                                                                                                               
     maxTokens: 8192,                                                                                                                                     
   };                                                                                                                                                     
                                                                                                                                                          
   export default {                                                                                                                                       
     reviewPerformance: async (report) => {                                                                                                               
       const agent = new Agent({                                                                                                                          
         initialState: {                                                                                                                                  
           model: gemmaCloudModel,                                                                                                                        
           systemPrompt: `You are the Master Strategist for an automated lottery simulation engine.                                                       
           Review the following performance report of the last 50 draws.                                                                                  
           Determine if the current rule weights are effective or if a strategic pivot is needed.                                                         
                                                                                                                                                          
           Return ONLY a JSON object:                                                                                                                     
           {                                                                                                                                              
             "summary": "Concise analysis of performance.",                                                                                               
             "adjustments": [                                                                                                                             
               { "rule_id": "...", "action": "BOOST_WEIGHT" | "PENALIZE_WEIGHT", "reason": "..." }                                                        
             ]                                                                                                                                            
           }`,                                                                                                                                            
           messages: [],                                                                                                                                  
         }                                                                                                                                                
       });                                                                                                                                                
                                                                                                                                                          
       agent.streamFn = (model, context, options) => {                                                                                                    
         return streamSimple(model, context, {                                                                                                            
           ...options,                                                                                                                                    
           apiKey: process.env.OLLAMA_API_KEY,                                                                                                            
           headers: { 'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}` }                                                                           
         });                                                                                                                                              
       };                                                                                                                                                 
                                                                                                                                                          
       await agent.prompt(`Performance Report: ${JSON.stringify(report)}`);                                                                               
                                                                                                                                                          
       const lastMessage = agent.state.messages[agent.state.messages.length - 1];                                                                         
       const responseText = lastMessage.content.map(p => p.text).join('');                                                                                
       const jsonMatch = responseText.match(/\{.*\}/s);                                                                                                   
                                                                                                                                                          
       if (jsonMatch) {                                                                                                                                   
         const parsed = JSON.parse(jsonMatch[0]);                                                                                                         
                                                                                                                                                          
         // Apply adjustments to weights.json                                                                                                             
         let adjustmentLogs = [];
         if (parsed.adjustments) {                                                                                                                        
           const weights = JSON.parse(await fs.readFile(WEIGHTS_PATH, 'utf-8'));                                                                          
           for (const adj of parsed.adjustments) {                                                                                                        
             if (weights[adj.rule_id]) {                                                                                                                  
               const factor = adj.action === 'BOOST_WEIGHT' ? 1.1 : 0.9;                                                                                  
               weights[adj.rule_id].scoring.multiplier *= factor;                                                                                         
               adjustmentLogs.push(`Strategist: Applied ${adj.action} to ${adj.rule_id}. Reason: ${adj.reason}`);                                                 
             }                                                                                                                                            
           }                                                                                                                                              
           await fs.writeFile(WEIGHTS_PATH, JSON.stringify(weights, null, 2));                                                                            
         }
         return { summary: parsed.summary, adjustments: adjustmentLogs };
       }
       return { summary: "Analysis failed", adjustments: [] };
     }                                                                                                                                                    
   };