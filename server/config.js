const env = process.env;

const config = {
 	listPerPage: env.LIST_PER_PAGE || 10,
	default_port: 3000,
	assets_path: "https://ctipe-production.up.railway.app/",
	manifest_path: "https://ctipe-production.up.railway.app/m?manifest"
}

module.exports = config;