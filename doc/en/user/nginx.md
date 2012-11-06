## Nginx
You can run Nginx as a load-balancing proxy for Magnode, and to serve static files.

	upstream magnode_www_cluster_1 {
		server 127.0.0.1:70000;
		server 127.0.0.1:70001;
		server 127.0.0.1:70002;
		server 127.0.0.1:70003;
	}

	server {
		listen 80;
		listen 443 ssl;

		server_name magnode.org;
		server_name_in_redirect off;

		proxy_temp_path /tmp;
		proxy_pass_header Server;

		open_file_cache  max=1000 inactive=1s;
		open_file_cache_valid 1s;
		open_file_cache_min_uses 2;
		open_file_cache_errors on;

		access_log /var/log/nginx/nodetest.log;

		try_files $uri $uri.html @magnode;

		location @magnode {
			proxy_set_header X-Real-IP $remote_addr;
			proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
			proxy_set_header Host $http_host;
			proxy_set_header X-NginX-Proxy true;

			proxy_pass http://magnode_www_cluster_1;
			proxy_redirect off;
		}
	}

Caching may be enabled:

		proxy_cache magnode_www;
		proxy_cache_valid  200 302  10m;
		proxy_cache_valid  404      1m;
		proxy_cache_bypass $http_authorization $cookie_authtoken;

