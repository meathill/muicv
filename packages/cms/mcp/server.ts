import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  createChangelogInputSchema,
  getChangelogInputSchema,
  normalizeCreateChangelogInput,
  normalizeGetChangelogInput,
  normalizeUpsertChangelogInput,
  upsertChangelogInputSchema,
} from './changelog-input.ts';
import {
  CmsAuthError,
  type CmsChangelogDocument,
  CmsClient,
  type CmsPostDocument,
  type CmsSkillDocument,
} from './payload-client.ts';
import {
  createPostInputSchema,
  getPostInputSchema,
  normalizeCreatePostInput,
  normalizeGetPostInput,
  normalizeUpsertPostInput,
  upsertPostInputSchema,
} from './post-input.ts';
import {
  createSkillInputSchema,
  getSkillInputSchema,
  normalizeCreateSkillInput,
  normalizeGetSkillInput,
  normalizeUpsertSkillInput,
  upsertSkillInputSchema,
} from './skill-input.ts';

const server = new McpServer({
  name: 'muicv-cms',
  version: '0.1.0',
});

type ToolTextResult = {
  isError?: boolean;
  content: Array<{
    type: 'text';
    text: string;
  }>;
};

server.registerTool(
  'create_post',
  {
    title: '创建 Mui 简历 CMS 文章',
    description:
      '在 Payload CMS 的 posts collection 里创建文章。默认 status=draft；只有明确传 status=published 才发布。',
    inputSchema: createPostInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const input = normalizeCreatePostInput(args);
      if (input.dryRun) {
        return jsonResult({ ok: true, dryRun: true, payload: input.payload });
      }

      const client = new CmsClient();
      const existing = await client.findPostBySlug(input.payload.slug);
      if (existing) {
        return errorResult(`slug "${input.payload.slug}" 已存在。请换 slug，或改用 upsert_post 更新已有文章。`);
      }

      const post = await client.createPost(input.payload);
      return jsonResult({ ok: true, action: 'created', post: toPostResult(post) });
    });
  },
);

server.registerTool(
  'upsert_post',
  {
    title: '创建或更新 Mui 简历 CMS 文章',
    description:
      '按 slug 查找文章；不存在则创建，存在且 onConflict=update 时更新。默认创建/更新草稿，除非明确传 status=published。',
    inputSchema: upsertPostInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const input = normalizeUpsertPostInput(args);
      if (input.dryRun) {
        return jsonResult({ ok: true, dryRun: true, onConflict: input.onConflict, payload: input.payload });
      }

      const client = new CmsClient();
      const existing = await client.findPostBySlug(input.payload.slug);

      if (!existing) {
        const post = await client.createPost(input.payload);
        return jsonResult({ ok: true, action: 'created', post: toPostResult(post) });
      }

      if (input.onConflict === 'error') {
        return errorResult(`slug "${input.payload.slug}" 已存在。设置 onConflict=update 才会覆盖更新。`);
      }

      const post = await client.updatePost(existing.id, input.payload);
      return jsonResult({ ok: true, action: 'updated', post: toPostResult(post) });
    });
  },
);

server.registerTool(
  'get_post',
  {
    title: '读取 Mui 简历 CMS 文章',
    description: '按 slug 读取 Payload CMS 里的 posts 文档，用于写作前查重或更新前确认。',
    inputSchema: getPostInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const { slug } = normalizeGetPostInput(args);
      const client = new CmsClient();
      const post = await client.findPostBySlug(slug);

      if (!post) {
        return jsonResult({ ok: true, found: false, slug });
      }

      return jsonResult({ ok: true, found: true, post: toPostResult(post) });
    });
  },
);

server.registerTool(
  'create_skill',
  {
    title: '创建 Mui 简历 CMS Skill',
    description:
      '在 Payload CMS 的 skillExtensions collection 里创建 skill 详情页。默认 status=draft；只有明确传 status=published 才发布。',
    inputSchema: createSkillInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const input = normalizeCreateSkillInput(args);
      if (input.dryRun) {
        return jsonResult({ ok: true, dryRun: true, payload: input.payload });
      }

      const client = new CmsClient();
      const existing = await client.findSkillBySlug(input.payload.slug);
      if (existing) {
        return errorResult(`slug "${input.payload.slug}" 已存在。请换 slug，或改用 upsert_skill 更新已有 skill。`);
      }

      const skill = await client.createSkill(input.payload);
      return jsonResult({ ok: true, action: 'created', skill: toSkillResult(skill) });
    });
  },
);

server.registerTool(
  'upsert_skill',
  {
    title: '创建或更新 Mui 简历 CMS Skill',
    description:
      '按 slug 查找 skill；不存在则创建，存在且 onConflict=update 时更新。默认创建/更新草稿，除非明确传 status=published。',
    inputSchema: upsertSkillInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const input = normalizeUpsertSkillInput(args);
      if (input.dryRun) {
        return jsonResult({ ok: true, dryRun: true, onConflict: input.onConflict, payload: input.payload });
      }

      const client = new CmsClient();
      const existing = await client.findSkillBySlug(input.payload.slug);

      if (!existing) {
        const skill = await client.createSkill(input.payload);
        return jsonResult({ ok: true, action: 'created', skill: toSkillResult(skill) });
      }

      if (input.onConflict === 'error') {
        return errorResult(`slug "${input.payload.slug}" 已存在。设置 onConflict=update 才会覆盖更新。`);
      }

      const skill = await client.updateSkill(existing.id, input.payload);
      return jsonResult({ ok: true, action: 'updated', skill: toSkillResult(skill) });
    });
  },
);

server.registerTool(
  'get_skill',
  {
    title: '读取 Mui 简历 CMS Skill',
    description: '按 slug 读取 Payload CMS 里的 skillExtensions 文档，用于写作前查重或更新前确认。',
    inputSchema: getSkillInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const { slug } = normalizeGetSkillInput(args);
      const client = new CmsClient();
      const skill = await client.findSkillBySlug(slug);

      if (!skill) {
        return jsonResult({ ok: true, found: false, slug });
      }

      return jsonResult({ ok: true, found: true, skill: toSkillResult(skill) });
    });
  },
);

server.registerTool(
  'create_changelog',
  {
    title: '创建 Mui 简历 CMS 更新日志',
    description:
      '在 Payload CMS 的 changelog collection 里创建更新日志。默认 status=draft；只有明确传 status=published 才发布。',
    inputSchema: createChangelogInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const input = normalizeCreateChangelogInput(args);
      if (input.dryRun) {
        return jsonResult({ ok: true, dryRun: true, payload: input.payload });
      }

      const client = new CmsClient();
      const existing = await client.findChangelogBySlug(input.payload.slug);
      if (existing) {
        return errorResult(
          `slug "${input.payload.slug}" 已存在。请换 slug，或改用 upsert_changelog 更新已有更新日志。`,
        );
      }

      const item = await client.createChangelog(input.payload);
      return jsonResult({ ok: true, action: 'created', changelog: toChangelogResult(item) });
    });
  },
);

server.registerTool(
  'upsert_changelog',
  {
    title: '创建或更新 Mui 简历 CMS 更新日志',
    description:
      '按 slug 查找更新日志；不存在则创建，存在且 onConflict=update 时更新。默认创建/更新草稿，除非明确传 status=published。',
    inputSchema: upsertChangelogInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const input = normalizeUpsertChangelogInput(args);
      if (input.dryRun) {
        return jsonResult({ ok: true, dryRun: true, onConflict: input.onConflict, payload: input.payload });
      }

      const client = new CmsClient();
      const existing = await client.findChangelogBySlug(input.payload.slug);

      if (!existing) {
        const item = await client.createChangelog(input.payload);
        return jsonResult({ ok: true, action: 'created', changelog: toChangelogResult(item) });
      }

      if (input.onConflict === 'error') {
        return errorResult(`slug "${input.payload.slug}" 已存在。设置 onConflict=update 才会覆盖更新。`);
      }

      const item = await client.updateChangelog(existing.id, input.payload);
      return jsonResult({ ok: true, action: 'updated', changelog: toChangelogResult(item) });
    });
  },
);

server.registerTool(
  'get_changelog',
  {
    title: '读取 Mui 简历 CMS 更新日志',
    description: '按 slug 读取 Payload CMS 里的 changelog 文档，用于写作前查重或更新前确认。',
    inputSchema: getChangelogInputSchema,
  },
  async (args) => {
    return withToolErrors(async () => {
      const { slug } = normalizeGetChangelogInput(args);
      const client = new CmsClient();
      const item = await client.findChangelogBySlug(slug);

      if (!item) {
        return jsonResult({ ok: true, found: false, slug });
      }

      return jsonResult({ ok: true, found: true, changelog: toChangelogResult(item) });
    });
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  if (error instanceof CmsAuthError) {
    console.error(error.message);
  } else {
    console.error('muicv-cms MCP server failed:', error);
  }
  process.exit(1);
});

async function withToolErrors(callback: () => Promise<ToolTextResult>): Promise<ToolTextResult> {
  try {
    return await callback();
  } catch (error: unknown) {
    return errorResult(formatErrorMessage(error));
  }
}

function jsonResult(value: unknown): ToolTextResult {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(message: string): ToolTextResult {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
  };
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof CmsAuthError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function toPostResult(post: CmsPostDocument) {
  return {
    id: post.id,
    slug: post.slug,
    section: post.section,
    status: post.status,
    title: post.title,
    url: `https://muicv.com/posts/${post.section}/${post.slug}`,
    cmsUrl: `${process.env.MUICV_CMS_URL ?? 'https://cms.muicv.com'}/admin/collections/posts/${post.id}`,
    updatedAt: post.updatedAt,
  };
}

function toSkillResult(skill: CmsSkillDocument) {
  return {
    id: skill.id,
    slug: skill.slug,
    status: skill.status,
    title: skill.title,
    publisher: skill.publisher,
    url: `https://muicv.com/skills/${skill.slug}`,
    cmsUrl: `${process.env.MUICV_CMS_URL ?? 'https://cms.muicv.com'}/admin/collections/skillExtensions/${skill.id}`,
    updatedAt: skill.updatedAt,
  };
}

function toChangelogResult(item: CmsChangelogDocument) {
  return {
    id: item.id,
    slug: item.slug,
    status: item.status,
    title: item.title,
    version: item.version,
    url: 'https://muicv.com/changelog',
    cmsUrl: `${process.env.MUICV_CMS_URL ?? 'https://cms.muicv.com'}/admin/collections/changelog/${item.id}`,
    updatedAt: item.updatedAt,
  };
}
