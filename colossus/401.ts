export default function render401(redirectURL: string) {
  return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>401 Not Authorized</title>
          <style>
              body {
                  background-color: #1a1a1a;
                  color: white;
                  font-family: Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  text-align: center;
                  margin: 0;
              }
              hr {
                  border: 0.2px solid rgba(209, 209, 209, 0.362);
                  margin-top: 50px;
                  margin-bottom: 50px;
              }
              h1 {
                  font-size: 2em;
                  margin-bottom: 10px;
              }
              h2 {
                  font-size: 1.5em;
                  margin-bottom: 20px;
              }
              p {
                  font-size: 1em;
                  max-width: 600px;
                  line-height: 1.5;
              }
              .error-container {
                  padding: 20px;
                  border-radius: 10px;
              }
              a {
                color: white;
              }
          </style>
      </head>
      <body>
          <div class="error-container">
              <h1>401 Not Authorized</h1>
              <hr>
              <h2>Are you sure you should be here?</h2>
              <p>Colossus is just a proxy to Geoserver enabling username/password authentication through the request query params, and you have not provided it.</p>
              <p>Add these to your URL: <code>&amp;username=&lt;your-username&gt;&amp;password=&lt;your-password&gt;</code> and try again.</p>
              <p>If you're looking for the Geoserver URL, please, access <a target=${"_blank"} href="${redirectURL}">the same link but in Geoserver</a></p>
          </div>
      </body>
      </html>`;
}
