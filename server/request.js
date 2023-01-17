const fetch = (url) => import('node-fetch').then(({default: fetch}) => fetch(url));

async function loader(resource_obj_list) {
	let container = [];

	resource_obj_list.forEach(obj => {
		let ref = fetch(obj.url)
		.then(response => response.text())
		.then(function (text) {
			//return (text); //JSON.parse
			return obj.type === 'json' ? JSON.parse(text) : text;
		})
		.catch((error) => {
			console.log(error.status, error);
			return error;
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj_list.forEach((obj,i) => obj.raw = done[i]);
	return resource_obj_list;
}

module.exports = loader;