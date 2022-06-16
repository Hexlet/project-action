// TODO https://hexlet.io/api/user-project-github-workflow/projects/:slug/
import path from 'path';

const apiUrl = '/api/user_project_github_workflow/';

const buildUrl = (part, host) => {
  const urlPath = path.join(apiUrl, part);
  const url = new URL(urlPath, host);
  return url.toString();
};

const buildRoutes = (host = 'https://hexlet.io') => ({
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
