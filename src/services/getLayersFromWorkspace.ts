import geoserver from "../repositories/geoserver";

export async function getLayersFromWorkspace(workspaceName: string): Promise<
  {
    name: string;
    href: string;
  }[]
> {
  try {
    const response = await geoserver.get(
      `/rest/workspaces/${workspaceName}/layers`
    );

    return response.data.layers.layer;
  } catch (error) {
    console.error(
      `[get-layers-from-workspace-service] Error getting layers from workspace: ${error}`
    );
    throw error;
  }
}
