let x = null;
const app = Vue.createApp({
	data() {
		return {
			title: "SoundsDB",
			type: 1,
			openDrawer: false,
			search_query:'',
			sounds:[],
			sounds_list:[],
			first_update:true,

			add_new_sound_open:false,
			new_sound_name: '',
			files: null,
			limit: 5,
			upload_msg: true,
			canDragAndDrop:false,
			uploading:false,

			ws: null,
			sockets_queue:[],

			current_sound_data:'',
			audio_loading: false,
			load_audio_progress:0,
			audio_player_open:false,
			sound_playing:false,
			audio_starred: false,
			audio_starred_icons: {
				on: 'star',
				off: 'star_outline'
			},
			sound_playing_icons: {
				on: 'pause',
				off: 'play_arrow'
			},

			wavesurfer: null,
			wavesurfer_loop:false,
			wavesurfer_loop_icons: {
				on: 'repeat',
				off: 'repeat_one'
			},
			wavesurfer_zoom: 1,

			thead:[	{
						value: 'ID',
						sort: 'none',
						columnId: 'id'
					}, 
					{
						slot: 'th-sound',
						class: 'gg',
						sort: 'asc',
						columnId: 'name'
					}, 
					"Play"
				],

			tbody:[	"id",
					{
						slot:"sound"
					},
					{
						slot:"play"
					}
				]
		}
	},
	mounted() {
		const el = this.$refs.upload_div;
		this.canDragAndDrop = (
						(
							("draggable" in el) ||
							("ondragstart" in el && "ondrop" in el)
						) &&
						window.FormData != null &&
						window.FileReader != null
					    );
		
		this.ws = new WebSocket(`ws://${window.location.host}/ws`);
		this.ws.addEventListener("open", ()=> {
			this.update_sounds();
		});

		this.ws.addEventListener("close", (e)=> {
			console.log("Connection closed: " + e);
		});
		this.ws.addEventListener("error", (e)=> {
			console.error("Error occured: "+ e);
		});

		this.wavesurfer = WaveSurfer.create({
			container: '#player_waveform',
			waveColor: '#41b883',
			progressColor: '#35495e'
		});
		
		this.wavesurfer.on("pause", ()=> {
			this.sound_playing = this.wavesurfer.isPlaying();
		});

		this.wavesurfer.on("loading", (prg)=> {
			this.audio_loading = true;
			this.load_audio_progress = prg/100;
		})

		this.wavesurfer.on("ready", ()=> {
			this.audio_loading = false;
			console.log("ready 1")
		});

		this.wavesurfer.on("finish", ()=> {
			if(this.wavesurfer_loop) {
				this.wavesurfer.seekTo(0);
				this.wavesurfer.playPause();
			}
		});
	},
	watch: {
		sound_playing() {
			if(this.sound_playing==false) {
				this.wavesurfer.pause();
			} else {
				this.wavesurfer.play();
			}
		},
		wavesurfer_zoom() {
			this.wavesurfer.zoom(this.wavesurfer_zoom);
		}
	},
	methods: {
		SendAndReceive(r,d="", fn) {
			let id = ID();
			this.sockets_queue[id] = fn;
			this.ws.send(JSON.stringify({"id":id, "req": r,"data":d}));
			this.ws.onmessage = function(e) {
				let tmp = JSON.parse(e.data);
				if(tmp.id == id) {
					fn(e);
				}
			}
		},
		update_sounds() {
			this.SendAndReceive("send_sounds_list", "",(e)=> {
				this.sounds = JSON.parse(JSON.parse(e.data).data);
				this.sounds_list = this.sounds.filter(x => x);
				if(this.first_update) {
					this.good_to_go();
				}
			})
		},
		good_to_go() {
			this.first_update = false;
			window.setTimeout(this.hide_splach_screen, 1000);
		},
		hide_splach_screen() {
			x.pauseAnimation();
			this.$refs.splach_screen.remove();
		},
		show(data) {
			this.SendAndReceive("sound_exists", data.id, (e)=> {
				if(JSON.parse(e.data).data == true) {
					this.current_sound_data = data;
					this.wavesurfer.load("http://"+window.location.host+"/assets/"+data.id+".mp3");
					this.audio_player_open = true;
				}
			});
		},
		x_contains_y(x,y) {
			return (x.toLocaleLowerCase().indexOf(y.toLocaleLowerCase()) >= 0)
		},
		search_changed() {
			if(this.search_query == "") {
				this.sounds_list = this.sounds.filter(x => x);
			} else {
				this.sounds_list = this.sounds
								.filter(x =>
									this.x_contains_y(x.name,
											this.search_query));
			}
		},
		toggle_play_sound() {
			this.wavesurfer.playPause();
			this.sound_playing = this.wavesurfer.isPlaying();
		},
		zoom_in() {
			this.wavesurfer_zoom += 0.1;
		},
		zoom_out() {
			if(this.wavesurfer_zoom >= 1.1) {
				this.wavesurfer_zoom -= 0.1;
			}
		},
		add_new_sound_click() {
			this.add_new_sound_open = true;
		},
		new_sounds_changed() {
			this.files = this.$refs.hidden_file_selector.files;
		},
		upload_div_click() {
			this.$refs
				.hidden_file_selector
				.dispatchEvent(new MouseEvent("click", {
					"view": window,
					"bubbles": true,
					"cancelable": false
				}));
		},
		upload_div_dragover(e) {
			e.preventDefault();
			e.stopPropagation();
			this.$refs.upload_div.style.border = "2px solid #41b883";
		},
		upload_div_dragleave() {
			this.$refs.upload_div.style.border = "2px dashed #41b883";	
		},
		upload_div_drop(e) {
			e.preventDefault();
			e.stopPropagation();
			this.files = e.dataTransfer.files;
			this.upload_msg = false;
			this.uploading = true;
		}
	}
});

document.addEventListener("DOMContentLoaded", ()=> {
	x = Particles.init({
		selector: '#particles_canvas',
		maxParticles: 150,
		connectParticles: true,
		color: "#41b883"
	});
});

/*
// options for breakpoints
		responsive: [
			{
				breakpoint: 768,
				options: {
					maxParticles: 200,
					color: '#48F2E3',
					connectParticles: true
				}
			}, 
			{
				breakpoint: 425,
				options: {
					maxParticles: 100,
					connectParticles: true
				}
			}, {
				breakpoint: 320,
				options: {
					maxParticles: 0 // disables particles.js
				}
			}
		]
*/
app.use(BalmUI);
app.use(BalmUIPlus);

let $theme = BalmUI.useTheme();

$theme.primary = "#41b883";
$theme.secondary = "#35495e";
$theme.background = "#fff";
$theme.surface = "#fff";
$theme.error = "#f44336";

$theme.onPrimary = "#000";
$theme.onSecondary = "#000";
$theme.onSurface = "#000";

const vm = app.mount("#vue_app");

/* 


    audioprocess – Fires continuously as the audio plays. Also fires on seeking.
    dblclick – When instance is double-clicked.
    destroy – When instance is destroyed.
    error – Occurs on error. Callback will receive (string) error message.

    interaction – When there's interaction with the waveform.

    mute – On mute change. Callback will receive (boolean) new mute status.

    scroll - When the scrollbar is moved. Callback will receive a ScrollEvent object.
    seek – On seeking. Callback will receive (float) progress [0..1].


*/