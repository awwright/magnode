## Testing

### Feature Tests

1. Download and unpack the tar file. The contents should extract to a new directory.
2. Decend into the new directory and run `./httpd.js`. The script should say no configuration is detected, and print a URL for the setup screen.
3. Go through the pages, select an unused database name, base URL, site name, and root user password as appropriate. Try obscure and unicode characters. The last page should instruct you to restart the process.
4. Restart the process and click on the login link. It should take you to the login screen.
5. Log in with the username and password you provided. It should bring you to the front page showing just the sample post.
6. Click "Posts" and click "New".
