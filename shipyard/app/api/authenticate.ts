export async function authenticate(user: string, password: string) {
  try {
    const response = await fetch("/api/authenticate", {
      method: "POST",
      body: JSON.stringify({ username: user, password: password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw error;
    }

    return;
  } catch (error) {
    throw error;
  }
}
