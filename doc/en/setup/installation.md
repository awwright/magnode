## Installation

Magnode is its own web server, so it does not need to be installed to the web root of your system, it doesn't need a web server at all. You may choose to use a web server to cache and load-balance Magnode and to serve static resources on disk, those static resources would need to go in your web root (see the section on Nginx for this usage).

### Git repository single-directory install

For basic development work or or small single-user websites, for simplicity, you may wish to deploy Magnode under a single directory. A single directory install can be setup in a subdirectory in your home directory, for instance, `/home/aaa/magnode`, or in the /opt tree which is designed for single packages, for instance, `/opt/magnode`.

Navigate to the directory you wish to place magnode under, then clone the repository and setup dependencies:

	git clone http://git.bzfx.net/~aaa/magnode.git
	cd magnode
	git submodule update --init
	(cd node_modules/sparql-spin.src && make)

### Single-directory usage

Magnode may be run out of a single directory. In this case, the file tree may reside in `/home/username` or may be located under `/opt` such as `/opt/magnode`. It's recommended you create a system-wide directory called `/opt/magnode`.

### System install usage

If you're designing a web application, you might set up your files like this:

<dl>
<dt>/etc/magnode/magnode.json</dt><dd>The main configuration file specifying all the services to be launched.</dd>
<dt>/var/lib/magnode/</dt><dd>Non-web files</dd>
<dt>/var/www/</dt><dd>Web-served static files</dd>
<dt>/usr/lib/node/magnode/</dt><dd>The location for core Magnode libraries</dd>
</dl>
