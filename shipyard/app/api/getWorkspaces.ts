export interface GetWorkspaces {
  workspaces: Workspaces;
}

export interface Workspaces {
  workspace: Workspace[];
}

export interface Workspace {
  name: string;
  href: string;
}

export async function getWorkspaces(
  user?: string
): Promise<Workspace[] | undefined> {
  try {
    const response = await fetch("/api/get-workspaces");

    if (!response.ok) {
      const error = await response.text();
      throw error;
    }

    const data: GetWorkspaces = await response.json();

    if (user) {
      return data.workspaces.workspace.filter((workspace) =>
        workspace.name.includes(user)
      );
    } else {
      return data.workspaces.workspace;
    }
  } catch (error) {
    throw error;
  }
}
