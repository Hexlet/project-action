// TODO https://hexlet.io/api/user-project-github-workflow/projects/:slug/
import * as path from 'node:path';

const apiUrl = '/api/user_project_github_workflow/';

const buildUrl = (part: string, host: string) => {
  const urlPath = path.join(apiUrl, part);
  const url = new URL(urlPath, host);
  return url.toString();
};

interface Routes {
  projectMemberPath: (id: number | string) => string;
  projectMemberCheckPath: (memberId: number | string) => string;
}

const buildRoutes = (
  host: string | undefined = 'https://hexlet.io',
): Routes => ({
  projectMemberPath: (id) => {
    const url = buildUrl(`project_members/${id}.json`, host);
    return url;
  },
  projectMemberCheckPath: (memberId) => {
    const url = buildUrl(`project_members/${memberId}/checks.json`, host);
    return url;
  },
});

export default buildRoutes;
