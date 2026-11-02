#!/usr/bin/env node
// Hall Pass MCP server (stdio). Exposes a small, user-scoped tool set; it cannot browse other
// people, send messages, like profiles, accept matches or delete accounts.
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { registerTools } from './tools/index.js';

const server = new McpServer(
  { name: 'hall-pass', version: '1.0.0' },
  {
    instructions:
      'Tools act only for the Hall Pass user who signed in with `npm run login`. Read tools never return message text, ' +
      'contact details or precise location. Before calling update_my_profile or update_my_preferences, show the user ' +
      'the exact change and get their confirmation.',
  },
);

registerTools(server);

await server.connect(new StdioServerTransport());
// stdout carries the protocol; diagnostics go to stderr.
console.error('[hall-pass-mcp] ready on stdio');
