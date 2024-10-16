import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import dayjs from "dayjs";
import "./App.css";

function App() {
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitleId, setCurrentSubtitleId] = useState(null); // Track the current subtitle ID
  const [startTime, setStartTime] = useState(null); // The time when playback starts
  const [intervalId, setIntervalId] = useState(null); // Store the interval id for cleanup
  const [autoScroll, setAutoScroll] = useState(true); // Track auto-scrolling

  const subtitleContainerRef = useRef(null); // Reference for the subtitle container

  const { getRootProps, getInputProps } = useDropzone({
    accept: ".srt",
    onDrop: (acceptedFiles) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        const parsedSubtitles = parseSrt(text);
        setSubtitles(parsedSubtitles);
        setCurrentSubtitleId(null); // Reset current subtitle
        setStartTime(null); // Reset start time
        setAutoScroll(true); // Enable auto-scroll when subtitles are first loaded
      };
      reader.readAsText(acceptedFiles[0]);
    },
  });

  // Parse the SRT file
  const parseSrt = (data) => {
    const normalizedData = data.replace(/\r\n/g, "\n").trim();
    const blocks = normalizedData.split(/\n\n+/);

    return blocks.map((block) => {
      const lines = block.split("\n");
      const id = parseInt(lines[0], 10);
      const timecodes = lines[1].split(" --> ");
      const text = lines.slice(2).join(" ").trim();

      return {
        id,
        startTime: timecodes[0].trim(),
        endTime: timecodes[1].trim(),
        text: text.replace(/\n/g, " "),
      };
    });
  };

  // Start showing subtitles from a specific time (in milliseconds)
  const startSubtitles = (startFromMs = 0) => {
    const currentTime = dayjs(); // Initialize start time
    setStartTime(currentTime); // Store start time

    let interval = setInterval(() => {
      const elapsed = dayjs().diff(currentTime, "millisecond") + startFromMs;

      const current = subtitles.find((sub) => {
        const subStart = timeToMilliseconds(sub.startTime);
        const subEnd = timeToMilliseconds(sub.endTime);
        return elapsed >= subStart && elapsed <= subEnd;
      });

      if (current) {
        setCurrentSubtitleId(current.id);
      }
    }, 100);

    setIntervalId(interval); // Store interval id for later cleanup
  };

  // Stop subtitles when necessary (e.g., when adjusting)
  const stopSubtitles = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  // Convert SRT time format to milliseconds (hh:mm:ss,SSS -> ms)
  const timeToMilliseconds = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":");
    const [secs, ms] = seconds.split(",");
    return (
      parseInt(hours) * 60 * 60 * 1000 +
      parseInt(minutes) * 60 * 1000 +
      parseInt(secs) * 1000 +
      parseInt(ms)
    );
  };

  // Handle phrase click to adjust the start time
  const handlePhraseClick = (subtitle) => {
    stopSubtitles(); // Stop any ongoing interval

    const subtitleTimeMs = timeToMilliseconds(subtitle.startTime); // Get time of the clicked subtitle in ms
    setCurrentSubtitleId(subtitle.id); // Set the clicked subtitle as the current one

    setAutoScroll(true); // Re-enable auto-scroll after a phrase is clicked
    // Start subtitles from the clicked phrase's timestamp
    startSubtitles(subtitleTimeMs);
  };

  // Auto-scroll to the current subtitle when it changes
  useEffect(() => {
    if (currentSubtitleId !== null && subtitleContainerRef.current && autoScroll) {
      const activeElement = document.getElementById(`subtitle-${currentSubtitleId}`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSubtitleId, autoScroll]);

  // Detect when the user scrolls manually and disable auto-scrolling
  const handleScroll = () => {
    if (subtitleContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = subtitleContainerRef.current;
      const isAtBottom = scrollTop + clientHeight === scrollHeight;

      if (!isAtBottom) {
        setAutoScroll(false); // Disable auto-scroll when the user scrolls manually
      }
    }
  };

  // Check if an element is in the viewport
  const isInViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  };

  // Re-enable auto-scrolling if the active subtitle is scrolled back into view
  useEffect(() => {
    const handleAutoScrollEnable = () => {
      if (currentSubtitleId !== null) {
        const activeElement = document.getElementById(`subtitle-${currentSubtitleId}`);
        if (activeElement && isInViewport(activeElement)) {
          setAutoScroll(true); // Re-enable auto-scroll if the active subtitle is back in view
        }
      }
    };

    subtitleContainerRef.current?.addEventListener("scroll", handleAutoScrollEnable);

    return () => {
      subtitleContainerRef.current?.removeEventListener("scroll", handleAutoScrollEnable);
    };
  }, [currentSubtitleId]);

  // Format the time for displaying
  const formatTime = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":");
    return `${hours}:${minutes}:${seconds}`;
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  return (
    <div className="App">
      {!subtitles.length && (<h1>Subtitle Viewer</h1>)}

      {/* Dropzone and button */}
      {!subtitles.length && (
        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          <p>Drag and drop an SRT file here, or click to select one</p>
        </div>
      )}

      {subtitles.length > 0 && (
        <div
          className="subtitle-container"
          ref={subtitleContainerRef}
          onScroll={handleScroll}
        >
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              id={`subtitle-${subtitle.id}`}
              className={`subtitle ${subtitle.id === currentSubtitleId ? "current" : ""
                }`}
              onClick={() => handlePhraseClick(subtitle)} // Handle phrase click
            >
              <span className="timestamp">{formatTime(subtitle.startTime)}</span> {subtitle.text}
            </div>
          ))}
        </div>
      )}

      {subtitles.length > 0 && !startTime && (
        <button
          className="button"
          onClick={() => {
            stopSubtitles(); // Stop any existing interval before starting again
            startSubtitles(0); // Start from the beginning (from 0 ms)
          }}
          disabled={!subtitles.length}
        >
          Start
        </button>
      )}

      <button className="toggle-theme" onClick={() => toggleTheme()}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M20 8.69V4h-4.69L12 .69L8.69 4H4v4.69L.69 12L4 15.31V20h4.69L12 23.31L15.31 20H20v-4.69L23.31 12zm-2 5.79V18h-3.52L12 20.48L9.52 18H6v-3.52L3.52 12L6 9.52V6h3.52L12 3.52L14.48 6H18v3.52L20.48 12zM12 6v12c3.31 0 6-2.69 6-6s-2.69-6-6-6" /></svg>
      </button>
    </div>
  );
}

export default App;
