/**
 * Model Context Protocol (MCP) Adapter (Phase 9)
 * Exposes RazorFlow Canonical Commerce Tools over JSON-RPC 2.0 / MCP Protocol specification
 */

import { listCanonicalTools, getToolDefinition } from './toolRegistry.js';
import { executeAgentTool, type ToolExecutionResponse } from './toolExecutor.js';
import type { AgentContext } from './agentTypes.js';

export interface McpJsonRpcRequest {
  jsonrpc?: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const MCP_SERVER_INFO = {
  name: 'razorflow-agent-commerce',
  version: '1.0.0',
  protocolVersion: '2024-11-05',
  capabilities: {
    tools: { listChanged: false },
    resources: { listChanged: false }
  }
};

/**
 * Handle incoming MCP JSON-RPC 2.0 request
 */
export async function handleMcpRequest(
  request: McpJsonRpcRequest,
  context: AgentContext
): Promise<McpJsonRpcResponse> {
  const reqId = request.id !== undefined ? request.id : null;
  const method = request.method;
  const params = request.params || {};

  try {
    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id: reqId,
          result: {
            protocolVersion: MCP_SERVER_INFO.protocolVersion,
            serverInfo: {
              name: MCP_SERVER_INFO.name,
              version: MCP_SERVER_INFO.version
            },
            capabilities: MCP_SERVER_INFO.capabilities,
            instructions: 'RazorFlow Autonomous Commerce Gateway for AI Buyers & Procurement Agents.'
          }
        };
      }

      case 'ping': {
        return {
          jsonrpc: '2.0',
          id: reqId,
          result: {}
        };
      }

      case 'tools/list': {
        const tools = listCanonicalTools().map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          riskLevel: t.riskLevel,
          requiredScope: t.requiredScope,
          financialSideEffect: t.financialSideEffect
        }));

        return {
          jsonrpc: '2.0',
          id: reqId,
          result: {
            tools
          }
        };
      }

      case 'tools/call': {
        const toolName = params.name;
        const toolArgs = params.arguments || {};

        if (!toolName || typeof toolName !== 'string') {
          return {
            jsonrpc: '2.0',
            id: reqId,
            error: {
              code: -32602,
              message: 'Invalid params: "name" parameter is required for tools/call'
            }
          };
        }

        const execRes: ToolExecutionResponse = await executeAgentTool({
          toolName,
          arguments: toolArgs,
          context
        });

        if (!execRes.success) {
          return {
            jsonrpc: '2.0',
            id: reqId,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: execRes.error,
                    correlationId: execRes.correlationId,
                    latencyMs: execRes.latencyMs
                  })
                }
              ],
              isError: true
            }
          };
        }

        return {
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(execRes.result)
              }
            ],
            correlationId: execRes.correlationId,
            traceId: execRes.traceId,
            latencyMs: execRes.latencyMs,
            isError: false
          }
        };
      }

      case 'resources/list': {
        return {
          jsonrpc: '2.0',
          id: reqId,
          result: {
            resources: [
              {
                uri: `merchant://${context.identity.merchantId}/catalog`,
                name: 'Merchant Product Catalog',
                description: 'Authoritative machine-readable product catalog',
                mimeType: 'application/json'
              },
              {
                uri: `merchant://${context.identity.merchantId}/capabilities`,
                name: 'Merchant Capabilities & Protocol Manifest',
                description: 'Declared protocol capabilities and policy bounds',
                mimeType: 'application/json'
              },
              {
                uri: `merchant://${context.identity.merchantId}/readiness`,
                name: 'Merchant AI-Readiness Evaluation',
                description: 'Real-time deterministic AI readiness scoring report',
                mimeType: 'application/json'
              }
            ]
          }
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id: reqId,
          error: {
            code: -32601,
            message: `Method "${method}" not found`
          }
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id: reqId,
      error: {
        code: -32603,
        message: 'Internal error: ' + err.message
      }
    };
  }
}
