import { useState } from "react";
import { useDropzone } from "react-dropzone";
import dayjs from "dayjs";
import "./App.css";

function App() {
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [timeAdjustment, setTimeAdjustment] = useState(0); // Time adjustment in milliseconds
  const [intervalId, setIntervalId] = useState(null); // Store the interval id for cleanup

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

  const startSubtitles = () => {
    const startTime = dayjs();

    let interval = setInterval(() => {
      const elapsed = dayjs().diff(startTime, "millisecond") + timeAdjustment; // Add time adjustment

      const current = subtitles.find((sub) => {
        const subStart = timeToMilliseconds(sub.startTime);
        const subEnd = timeToMilliseconds(sub.endTime);
        return elapsed >= subStart && elapsed <= subEnd;
      });

      if (current) {
        setCurrentSubtitle(current.text);
      } else {
        setCurrentSubtitle((prevSubtitle) => prevSubtitle);
      }
    }, 100);

    setIntervalId(interval); // Store interval id for later cleanup
  };

  const stopSubtitles = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

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

  const handleTimeAdjustment = (e) => {
    const newAdjustment = parseInt(e.target.value, 10);
    setTimeAdjustment(newAdjustment); // Update time adjustment
  };

  return (
    <main className="App">
      {subtitles.length === 0 ? <>
        <h1>Subtitle Viewer</h1>

        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          <p>Drag and drop an SRT file here, or click to select one</p>
        </div>
      </> : <>
        <div className="subtitle-display">
          <h2>{currentSubtitle}</h2>
        </div>

        <button
          onClick={() => {
            stopSubtitles();
            startSubtitles();
          }}
          disabled={!subtitles.length}
        >
          Start Subtitles
        </button>

        <div className="time-adjustment">
          <label>
            Time Adjustment (ms): {timeAdjustment}ms
            <input
              type="range"
              min="-480000"
              max="480000"
              step="500"
              value={timeAdjustment}
              onChange={handleTimeAdjustment}
            />
          </label>
        </div>
      </>}
    </main>
  );
}

export default App;
