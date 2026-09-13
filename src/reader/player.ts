namespace YomiVoxReader {
  export function createAudioPlayer(onStateChange: (playing: boolean) => void) {
    let currentAudio: HTMLAudioElement | null = null;

    function stop() {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      onStateChange(false);
    }

    function play(url: string) {
      stop();
      const audio = new Audio(url);
      currentAudio = audio;
      onStateChange(true);
      const finish = () => {
        if (currentAudio !== audio) return;
        currentAudio = null;
        onStateChange(false);
      };
      audio.onended = finish;
      audio.onerror = finish;
      void audio.play().catch(finish);
    }

    return { play, stop, get isPlaying() { return currentAudio !== null; } };
  }
}
