import React, { useState, useEffect } from 'react';
import {
  Bot,
  HelpCircle,
  Package,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AgentType } from '@ai-support/shared';

interface Agent {
  type: AgentType;
  name: string;
  description: string;
}

interface AgentCapabilities {
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  tools: Array<{ name: string; description: string }>;
}

const agentIcons: Record<AgentType, React.ReactNode> = {
  router: <Bot className="w-5 h-5" />,
  support: <HelpCircle className="w-5 h-5" />,
  order: <Package className="w-5 h-5" />,
  billing: <CreditCard className="w-5 h-5" />,
};

const agentColors: Record<AgentType, string> = {
  router: 'from-gray-500 to-gray-600',
  support: 'from-emerald-500 to-emerald-600',
  order: 'from-amber-500 to-amber-600',
  billing: 'from-violet-500 to-violet-600',
};

export function AgentInfo() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<AgentType | null>(null);
  const [capabilities, setCapabilities] = useState<Record<AgentType, AgentCapabilities>>({} as any);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await api.getAgents();
        setAgents(data.agents);
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    };

    loadAgents();
  }, []);

  const toggleAgent = async (type: AgentType) => {
    if (expandedAgent === type) {
      setExpandedAgent(null);
      return;
    }

    setExpandedAgent(type);

    if (!capabilities[type]) {
      setIsLoading(true);
      try {
        const data = await api.getAgentCapabilities(type);
        setCapabilities((prev) => ({ ...prev, [type]: data }));
      } catch (error) {
        console.error('Failed to load capabilities:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Available Agents</h3>
        <p className="text-sm text-gray-500 mt-1">
          Our AI automatically routes your query to the right specialist
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {agents.map((agent) => (
          <div key={agent.type}>
            <button
              onClick={() => toggleAgent(agent.type)}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agentColors[agent.type]} text-white flex items-center justify-center`}
              >
                {agentIcons[agent.type]}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{agent.name}</div>
                <div className="text-sm text-gray-500">{agent.description}</div>
              </div>
              {expandedAgent === agent.type ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedAgent === agent.type && (
              <div className="px-4 pb-4 bg-gray-50">
                {isLoading ? (
                  <div className="py-4 text-center text-gray-500 text-sm">
                    Loading capabilities...
                  </div>
                ) : capabilities[agent.type] ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Tools
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {capabilities[agent.type].tools.map((tool) => (
                          <div
                            key={tool.name}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg border border-gray-200 text-xs"
                            title={tool.description}
                          >
                            <Wrench className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">{tool.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
