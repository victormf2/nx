import { join } from 'path';
import { existsSync } from 'fs';
import { workspaceRoot } from 'nx/src/utils/app-root';
import {
  loadNxPlugins,
  mergePluginTargetsWithNxTargets,
} from 'nx/src/utils/nx-plugin';
import { ProjectGraphProcessorContext } from 'nx/src/config/project-graph';
import { mergeNpmScriptsWithTargets } from 'nx/src/utils/project-graph-utils';
import { ProjectGraphBuilder } from '../project-graph-builder';

export function buildWorkspaceProjectNodes(
  ctx: ProjectGraphProcessorContext,
  builder: ProjectGraphBuilder
) {
  const toAdd = [];
  Object.keys(ctx.workspace.projects).forEach((key) => {
    const p = ctx.workspace.projects[key];
    const projectRoot = join(workspaceRoot, p.root);
    if (existsSync(join(projectRoot, 'package.json'))) {
      p.targets = mergeNpmScriptsWithTargets(projectRoot, p.targets);
    }
    p.targets = mergePluginTargetsWithNxTargets(
      p.root,
      p.targets,
      loadNxPlugins(ctx.workspace.plugins)
    );
    const projectType =
      p.projectType === 'application'
        ? key.endsWith('-e2e')
          ? 'e2e'
          : 'app'
        : 'lib';
    const tags =
      ctx.workspace.projects && ctx.workspace.projects[key]
        ? ctx.workspace.projects[key].tags || []
        : [];

    toAdd.push({
      name: key,
      type: projectType,
      data: {
        ...p,
        tags,
        files: ctx.fileMap[key],
      },
    });
  });

  // Sort by root directory length (do we need this?)
  toAdd.sort((a, b) => {
    if (!a.data.root) return -1;
    if (!b.data.root) return -1;
    return a.data.root.length > b.data.root.length ? -1 : 1;
  });

  toAdd.forEach((n) => {
    builder.addNode({
      name: n.name,
      type: n.type,
      data: n.data,
    });
  });
}
