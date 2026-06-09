/* eslint-disable import/no-import-module-exports */
/* eslint-disable global-require */
import { join, parse } from 'node:path';
import { existsSync } from 'fs-extra';
import { isDevMode, userDataRecipesPath } from '../environment-remote';

export const getRecipeDirectory = (id: string = ''): string => {
  return userDataRecipesPath(id);
};

export const getDevRecipeDirectory = (id: string = ''): string => {
  return userDataRecipesPath('dev', id);
};

export const loadRecipeConfig = (recipeId: string) => {
  try {
    const configPath = `${recipeId}/package.json`;
    // Delete module from cache
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete require.cache[require.resolve(configPath)];

    // eslint-disable-next-line import/no-dynamic-require
    const config = require(configPath);

    const moduleConfigPath = require.resolve(configPath);
    config.path = parse(moduleConfigPath).dir;

    return config;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const recipesPaths = [getDevRecipeDirectory(), getRecipeDirectory()];

if (isDevMode) {
  // In dev mode, search the project's recipes source directory first
  // so changes to recipes/recipes/whatsapp/ take effect immediately
  const projectRecipesBase = join(__dirname, '..', '..', 'recipes', 'recipes');
  if (existsSync(projectRecipesBase)) {
    recipesPaths.unshift(projectRecipesBase);
  }
}

module.paths.unshift(...recipesPaths);
