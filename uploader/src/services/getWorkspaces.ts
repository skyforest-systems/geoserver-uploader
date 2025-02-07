import geoserver from "../repositories/geoserver";

export async function getWorkspaces(): Promise<
  {
    name: string;
    href: string;
  }[]
> {
  try {
    const response = await geoserver.get(`/rest/workspaces/`);

    return response.data.workspaces.workspace;
  } catch (error) {
    console.error(
      `[get-layers-from-workspace-service] Error getting layers from workspace: ${error}`
    );
    throw error;
  }
}
