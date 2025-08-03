
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.querySelector('.progress-bar');
        this.progress = document.getElementById('progress');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.albumArt = document.getElementById('albumArt');
        this.audioUpload = document.getElementById('audioUpload');
        this.playlistContainer = document.querySelector('.playlist-container');
        this.repeatBtn = document.getElementById('repeatBtn');

        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isDragging = false;
        this.lastProgressUpdate = 0;
        this.isRepeatAll = true;

        this.init();
    }

    init() {
        this.loadDefaultPlaylist();
        this.loadSavedPlaylist();
        this.setupEventListeners();
        this.setVolume(50);

        if (this.playlist.length > 0) {
            this.loadTrack(0);
        } else {
            this.trackTitle.textContent = 'No songs in playlist';
            this.trackArtist.textContent = 'Upload music to get started';
            this.albumArt.src = 'https://via.placeholder.com/200x200/000000/ffffff?text=♪';
        }

        this.updatePlaylistDisplay();
    }

    loadDefaultPlaylist() {
        // Add the pre-loaded songs to the playlist
        const defaultSongs = [
            {
                id: 'song1',
                title: 'Saiyaara',
                artist: 'Ahaan Panday, Aneet Padda',
                src: './attached_assets/Saiyaara Title Song _ Ahaan Panday, Aneet Padda _ Tanishk Bagchi, Faheem A, Arslan N _ Irshad Kamil_1754253142645.mp3',
                albumArt: 'https://via.placeholder.com/200x200/ff6b6b/ffffff?text=♪',
                saved: false
            },
            {
                id: 'song2',
                title: 'राम सिया राम',
                artist: 'Raghunandan Raghav',
                src: './attached_assets/राम सिया राम_ #RaghunandanRaghav #Ram Hare_#HareRamaHareKrishna__( Lyrical)#krishnagurjarofficial_1754253142695.mp3',
                albumArt: 'https://via.placeholder.com/200x200/4ecdc4/ffffff?text=♪',
                saved: false
            }
        ];

        // Only add default songs if playlist is empty
        if (this.playlist.length === 0) {
            this.playlist = defaultSongs;
        }
    }

    savePlaylist() {
        try {
            const playlistData = this.playlist.map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                albumArt: track.albumArt,
                saved: track.saved || false,
                src: track.src.startsWith('blob:') ? null : track.src
            }));
            localStorage.setItem('musicPlayerPlaylist', JSON.stringify(playlistData));
            localStorage.setItem('musicPlayerCurrentIndex', this.currentTrackIndex.toString());
        } catch (error) {
            console.warn('Could not save playlist:', error);
        }
    }

    loadSavedPlaylist() {
        try {
            const savedPlaylist = localStorage.getItem('musicPlayerPlaylist');
            const savedIndex = localStorage.getItem('musicPlayerCurrentIndex');

            if (savedPlaylist) {
                const parsedPlaylist = JSON.parse(savedPlaylist);
                const validTracks = parsedPlaylist.filter(track => track.src !== null);
                
                // Merge with default playlist, avoiding duplicates
                validTracks.forEach(savedTrack => {
                    const exists = this.playlist.some(track => track.id === savedTrack.id);
                    if (!exists) {
                        this.playlist.push(savedTrack);
                    }
                });

                if (savedIndex && parseInt(savedIndex) < this.playlist.length) {
                    this.currentTrackIndex = parseInt(savedIndex);
                }
            }
        } catch (error) {
            console.warn('Could not load saved playlist:', error);
        }
    }

    generateTrackId() {
        return 'track-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());

        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.progressHandle.addEventListener('mousedown', (e) => this.startDragging(e));
        this.progressBar.addEventListener('mousedown', (e) => this.startDragging(e));
        document.addEventListener('mousemove', (e) => this.dragProgress(e));
        document.addEventListener('mouseup', () => this.stopDragging());
        
        this.progressHandle.addEventListener('touchstart', (e) => this.startDragging(e));
        this.progressBar.addEventListener('touchstart', (e) => this.startDragging(e));
        document.addEventListener('touchmove', (e) => this.dragProgress(e));
        document.addEventListener('touchend', () => this.stopDragging());

        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', this.throttle(() => this.updateProgress(), 100));
        this.audio.addEventListener('ended', () => this.nextTrack());
        this.audio.addEventListener('loadstart', () => this.resetProgress());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));

        this.audioUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.playlistContainer.addEventListener('click', (e) => this.handlePlaylistClick(e));
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
    }

    togglePlayPause() {
        if (this.playlist.length === 0) {
            alert('No songs in playlist. Please upload music files to get started.');
            return;
        }

        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        try {
            // Check if audio source is valid
            if (!this.audio.src || this.audio.src === window.location.href) {
                this.trackTitle.textContent = 'Please select a song';
                this.trackArtist.textContent = 'No song loaded';
                return;
            }

            await this.audio.play();
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            document.body.classList.add('playing');
        } catch (error) {
            console.warn('Playback failed:', error);
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            document.body.classList.remove('playing');
            
            // Show user-friendly error message
            this.trackTitle.textContent = 'Error playing audio';
            this.trackArtist.textContent = 'File may be corrupted or unsupported';
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.body.classList.remove('playing');
    }

    previousTrack() {
        if (this.playlist.length === 0) return;

        this.currentTrackIndex = this.currentTrackIndex === 0 
            ? this.playlist.length - 1 
            : this.currentTrackIndex - 1;

        this.loadTrack(this.currentTrackIndex);
        if (this.isPlaying) this.play();
    }

    nextTrack() {
        if (this.playlist.length === 0) return;

        const wasPlaying = this.isPlaying;

        if (this.isRepeatAll) {
          this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        } else {
          if (this.currentTrackIndex < this.playlist.length - 1) {
            this.currentTrackIndex++;
          } else {
            this.pause();
            return;
          }
        }

        this.loadTrack(this.currentTrackIndex);
        
        if (wasPlaying) {
            setTimeout(() => {
                this.play();
            }, 100);
        }
    }

    toggleRepeat() {
        this.isRepeatAll = !this.isRepeatAll;
        if (this.isRepeatAll) {
            this.repeatBtn.classList.add('active');
            this.repeatBtn.title = 'Repeat All';
        } else {
            this.repeatBtn.classList.remove('active');
            this.repeatBtn.title = 'Repeat Off';
        }
    }

    loadTrack(index) {
        if (!this.playlist[index]) {
            this.trackTitle.textContent = 'No songs in playlist';
            this.trackArtist.textContent = 'Upload music to get started';
            this.albumArt.src = 'https://via.placeholder.com/200x200/000000/ffffff?text=♪';
            return;
        }

        const track = this.playlist[index];

        try {
            this.pause();
            this.resetProgress();

            // Validate file path before setting
            if (track.src && track.src.trim() !== '') {
                this.audio.src = track.src;
                this.trackTitle.textContent = track.title || 'Unknown Title';
                this.trackArtist.textContent = track.artist || 'Unknown Artist';
                this.albumArt.src = track.albumArt || 'https://via.placeholder.com/200x200/000000/ffffff?text=♪';

                this.currentTrackIndex = index;
                this.updatePlaylistDisplay();
                this.savePlaylist();
            } else {
                throw new Error('Invalid audio source');
            }
        } catch (error) {
            console.warn('Failed to load track:', track.title, error);
            this.trackTitle.textContent = 'Error loading track';
            this.trackArtist.textContent = 'Please try another file or upload new music';
        }
    }

    seekTo(e) {
        if (!this.audio.duration || isNaN(this.audio.duration)) return;

        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.audio.duration;

        if (time >= 0 && time <= this.audio.duration) {
            this.audio.currentTime = time;
            this.updateProgress();
        }
    }

    startDragging(e) {
        this.isDragging = true;
        e.preventDefault();
        this.dragProgress(e);
    }

    dragProgress(e) {
        if (!this.isDragging || !this.audio.duration || isNaN(this.audio.duration)) return;

        const rect = this.progressBar.getBoundingClientRect();
        let clientX;
        
        if (e.touches) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const time = percent * this.audio.duration;

        this.progress.style.width = `${percent * 100}%`;
        this.progressHandle.style.left = `${percent * 100}%`;
        this.currentTimeEl.textContent = this.formatTime(time);
        
        if (time >= 0 && time <= this.audio.duration) {
            this.audio.currentTime = time;
        }
    }

    stopDragging() {
        this.isDragging = false;
    }

    updateProgress() {
        if (this.isDragging) return;

        const currentTime = this.audio.currentTime || 0;
        const duration = this.audio.duration || 0;

        if (duration && !isNaN(currentTime) && !isNaN(duration) && duration > 0) {
            const percent = Math.min(100, Math.max(0, (currentTime / duration) * 100));
            
            requestAnimationFrame(() => {
                this.progress.style.width = `${percent}%`;
                this.progressHandle.style.left = `${percent}%`;
            });
        }

        this.currentTimeEl.textContent = this.formatTime(currentTime);
    }

    updateDuration() {
        const duration = this.audio.duration;
        if (duration && !isNaN(duration)) {
            this.durationEl.textContent = this.formatTime(duration);
        } else {
            this.durationEl.textContent = '0:00';
        }
    }

    resetProgress() {
        this.progress.style.width = '0%';
        this.progressHandle.style.left = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
    }

    setVolume(value) {
        const volume = Math.max(0, Math.min(100, value));
        this.audio.volume = volume / 100;
        this.volumeSlider.value = volume;
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    handleFileUpload(e) {
        const files = Array.from(e.target.files);

        files.forEach(file => {
            if (file.type.startsWith('audio/') && file.size < 50 * 1024 * 1024) {
                try {
                    const url = URL.createObjectURL(file);
                    const track = {
                        id: this.generateTrackId(),
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        artist: 'Unknown Artist',
                        src: url,
                        albumArt: 'https://via.placeholder.com/200x200/333333/ffffff?text=♪',
                        saved: false
                    };

                    this.playlist.push(track);

                    if (this.playlist.length === 1) {
                        this.loadTrack(0);
                    }
                } catch (error) {
                    console.warn('Failed to load file:', file.name, error);
                    alert(`Failed to load ${file.name}. Please try again.`);
                }
            } else if (file.size >= 50 * 1024 * 1024) {
                alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
            } else {
                alert(`File "${file.name}" is not a supported audio format.`);
            }
        });

        this.updatePlaylistDisplay();
        this.savePlaylist();
        e.target.value = '';
    }

    updatePlaylistDisplay() {
        const existingItems = this.playlistContainer.querySelectorAll('.playlist-item:not(.upload-section)');
        existingItems.forEach(item => item.remove());

        const uploadSection = this.playlistContainer.querySelector('.upload-section');

        this.playlist.forEach((track, index) => {
            const playlistItem = document.createElement('div');
            playlistItem.className = `playlist-item ${index === this.currentTrackIndex ? 'active' : ''}`;
            playlistItem.dataset.index = index;

            playlistItem.innerHTML = `
                <i class="fas fa-music"></i>
                <div class="track-details">
                    <span class="track-name">${track.title}</span>
                    <span class="track-artist">${track.artist}</span>
                </div>
                <div class="track-controls">
                    <button class="save-btn ${track.saved ? 'saved' : ''}" data-index="${index}" title="${track.saved ? 'Saved' : 'Save track'}">
                        <i class="fas ${track.saved ? 'fa-heart' : 'fa-heart-o'}"></i>
                    </button>
                    <button class="remove-btn" data-index="${index}" title="Remove track">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            this.playlistContainer.insertBefore(playlistItem, uploadSection);
        });
    }

    handlePlaylistClick(e) {
        if (e.target.closest('.save-btn')) {
            const index = parseInt(e.target.closest('.save-btn').dataset.index);
            this.toggleSaveTrack(index);
            return;
        }

        if (e.target.closest('.remove-btn')) {
            const index = parseInt(e.target.closest('.remove-btn').dataset.index);
            this.removeTrack(index);
            return;
        }

        const playlistItem = e.target.closest('.playlist-item:not(.upload-section)');
        if (playlistItem) {
            const index = parseInt(playlistItem.dataset.index);
            if (index !== -1 && index < this.playlist.length) {
                this.currentTrackIndex = index;
                this.loadTrack(index);
            }
        }
    }

    toggleSaveTrack(index) {
        if (this.playlist[index]) {
            this.playlist[index].saved = !this.playlist[index].saved;
            this.updatePlaylistDisplay();
            this.savePlaylist();
        }
    }

    removeTrack(index) {
        if (this.playlist.length <= 1) {
            alert('Cannot remove the last track in the playlist');
            return;
        }

        if (confirm('Are you sure you want to remove this track?')) {
            if (this.playlist[index].src.startsWith('blob:')) {
                URL.revokeObjectURL(this.playlist[index].src);
            }

            this.playlist.splice(index, 1);

            if (index === this.currentTrackIndex) {
                if (index >= this.playlist.length) {
                    this.currentTrackIndex = this.playlist.length - 1;
                }
                this.loadTrack(this.currentTrackIndex);
            } else if (index < this.currentTrackIndex) {
                this.currentTrackIndex--;
            }

            this.updatePlaylistDisplay();
            this.savePlaylist();
        }
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    handleAudioError(e) {
        console.warn('Audio error:', e);
        this.trackTitle.textContent = 'Error playing audio';
        this.trackArtist.textContent = 'File may be corrupted or try uploading new music';
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.body.classList.remove('playing');
    }

    handleKeyPress(e) {
        // Only handle shortcuts when not typing in an input
        if (e.target.tagName === 'INPUT') return;

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.previousTrack();
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.nextTrack();
                }
                break;
            case 'ArrowUp':
                if (e.ctrlKey) {
                    e.preventDefault();
                    const newVolumeUp = Math.min(100, parseInt(this.volumeSlider.value) + 10);
                    this.setVolume(newVolumeUp);
                }
                break;
            case 'ArrowDown':
                if (e.ctrlKey) {
                    e.preventDefault();
                    const newVolumeDown = Math.max(0, parseInt(this.volumeSlider.value) - 10);
                    this.setVolume(newVolumeDown);
                }
                break;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
