import { serve } from "https://deno.land/std@0.85.0/http/server.ts";
import { serveFile } from "http://deno.land/std@0.85.0/http/file_server.ts"
import {
	acceptWebSocket,
	isWebSocketCloseEvent,
	isWebSocketPingEvent,
	WebSocket
} from "https://deno.land/std@0.85.0/ws/mod.ts";

const current_path = new URL('.', import.meta.url)
					.pathname
					.substr(1)
					.split("/")
					.join("\\");
const index_path = `${current_path}htdocs\\index.html`;

const server = serve({ hostname:"0.0.0.0", port: 8000 });

console.log("http://localhost:8000/");


async function fileExists(path: string) {
	try {
		const stats = await Deno.lstat(path);
		return stats && stats.isFile;
	} catch(e) {
		if(e && e instanceof Deno.errors.NotFound) {
			return false;
		} else {
			throw e;
		}
	}
}

async function handlWebSocket(sock: WebSocket) {
	console.log("socket connected");
	try {
		for await (const ev of sock) {
			if(typeof ev === "string") {
				console.log("ws:Text", ev);
				let tmp = JSON.parse(ev);
				if(tmp.req == "send_sounds_list") {
					try {
						const sounds = await Deno.readFile(current_path+"htdocs\\sounds.json");
						const data = JSON.stringify({"id":tmp.id, "req":"send_sounds_list", "data":new TextDecoder("utf-8").decode(sounds)});
						await sock.send(data)
					} catch(file_err) {
						console.error("Failed to fetch sounds list: "+file_err)
					}
				} else if(tmp.req == "sound_exists") {
					let res = await fileExists(`${current_path}assets\\${tmp.data}.mp3`);
					const data = JSON.stringify({"id":tmp.id, "req":"sound_exists", "data":res});
					await sock.send(data);
				} else {
					await sock.send(ev);
				}
			} else if(ev instanceof Uint8Array) {
				//bin msg
				console.log("ws:Binary", ev);
			} else if(isWebSocketCloseEvent(ev)) {
				//close
				const { code, reason } = ev;
				console.log("ws:Close", code, reason);
			}
		}
	} catch (err) {
		console.error(`Failed to receive frame: ${err}`);

		if(!sock.isClosed) {
			await sock.close(1000).catch(console.error);
		}
	}
}

for await (const req of server) {

	if (req.url.startsWith("/assets")) {
		let tmp = current_path+req.url;
		console.log(tmp);
		if(await fileExists(tmp)) {
			const content = await serveFile(req, tmp);
			req.respond(content);
		} else {
			req.respond({ body: "assets/" });
		}
		continue;
	}

	if(req.url === '/ws') {
		const { conn, r: bufReader, w: bufWriter, headers } = req;
		acceptWebSocket({
			conn,
			bufReader,
			bufWriter,
			headers,
		})
			.then(handlWebSocket)
			.catch(async (err) => {
				console.error(`failed to accept websocket: ${err}`);
				await req.respond({ status: 400 });
			});
		continue;
	}

	const path = `${current_path}htdocs\\${req.url}`;
	console.log(path)
	
	if(await fileExists(path)) {
		const content = await serveFile(req, path);
		req.respond(content);
		continue;
	}

	if (req.url === '/') {
		if(await fileExists(index_path)) {
			const content = await serveFile(req, index_path);
			req.respond(content);
		} else {
			req.respond({status: 404})
		}
	} else if (req.url === '/about') {
		req.respond({ body: "About" });
	} else {
		req.respond({status: 404});
	}
}