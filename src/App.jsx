import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import dayjs from "dayjs";
import "./App.css";

function App() {
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitleId, setCurrentSubtitleId] = useState(null); // Track the current subtitle ID
  const [timeAdjustment, setTimeAdjustment] = useState(0); // Time adjustment in milliseconds
  const [intervalId, setIntervalId] = useState(null); // Store the interval id for cleanup

  const subtitleContainerRef = useRef(null); // Reference for the subtitle container

  const { getRootProps, getInputProps } = useDropzone({
    accept: ".srt",
    onDrop: (acceptedFiles) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        const parsedSubtitles = parseSrt(text);
        setSubtitles(parsedSubtitles);
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

  // Start showing subtitles
  const startSubtitles = () => {
    const startTime = dayjs(); // Initialize startTime when button is clicked

    let interval = setInterval(() => {
      const elapsed = dayjs().diff(startTime, "millisecond") + timeAdjustment; // Add time adjustment

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

  // Convert SRT time format to milliseconds
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

  // Handle time adjustment
  const handleTimeAdjustment = (e) => {
    const newAdjustment = parseInt(e.target.value, 10);
    setTimeAdjustment(newAdjustment); // Update time adjustment
  };

  const formatTime = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Auto-scroll to the current subtitle when it changes
  useEffect(() => {
    if (currentSubtitleId !== null && subtitleContainerRef.current) {
      const activeElement = document.getElementById(`subtitle-${currentSubtitleId}`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSubtitleId]);

  return (
    <div className="App">
      {subtitles.length === 0 ? <>
        <h1>Subtitle Viewer</h1>

        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          <p>Drag and drop an SRT file here, or click to select one</p>
        </div>
      </> : <>
        {/* Subtitle Display */}
        <div className="subtitle-container" ref={subtitleContainerRef}>
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              id={`subtitle-${subtitle.id}`}
              className={`subtitle ${subtitle.id === currentSubtitleId ? "current" : ""
                }`}
            >
              <span className="timestamp">{formatTime(subtitle.startTime)}</span>
              {subtitle.text}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="start-subtitles"
          onClick={() => {
            stopSubtitles(); // Stop any existing interval before starting again
            startSubtitles();
          }}
          disabled={!subtitles.length}
        >
          Start Subtitles
        </button>

        {/* Time adjustment slider */}
        <div className="time-adjustment">
          <label>
            <span>Time adjust, ms:</span>
            <input
              type="range"
              min="-480000"
              max="480000"
              step="100"
              value={timeAdjustment}
              onChange={handleTimeAdjustment}
            />{' '}
            <span>{timeAdjustment}ms</span>
          </label>
        </div>
      </>
      }
    </div >
  );
}

export default App;
