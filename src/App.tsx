import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import "./css/main.css";
import Home from "./views/Home";
import Lobby from "./views/Lobby";
import ImprovedWebSocket from "./utils/improvedWebSocket";
import Game from "./views/Game";
import JoinGame from "./views/JoinGame";
import { Player, User } from "./interfaces/game";

export interface UserEndTime {
  id: string;
  finished: number;
}

export interface GameState {
  startTime: number;
  endTimes: UserEndTime[];
}

function App() {
  let navigate = useNavigate();
  let [webSocket, setWebSocket] = useState<ImprovedWebSocket | null>(null);
  let [taskCount, setTaskCount] = useState<number | null>(null);
  let [player, setPlayer] = useState<Player | null>(null);
  let [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  let [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (webSocket === null) navigate("/");
  }, [webSocket, navigate]);

  const userFinishedListener = (
    _: ImprovedWebSocket,
    ev: MessageEvent<any>
  ) => {
    let op = JSON.parse(ev.data).op;
    let data = JSON.parse(ev.data).d;

    if (gameState !== null) {
      if (op === "Response" && data.op === "Compile") {
        setGameState((prev) => {
          if (prev === null) {
            return null;
          } else {
            return {
              ...(prev as GameState),
              endTimes: [...prev.endTimes, { id: "You", finished: Date.now() }],
            };
          }
        });
      }

      if (op === "GameEvent" && data.op === "TaskFinished") {
        setGameState((prev) => {
          if (prev === null) {
            return null;
          } else {
            return {
              ...(prev as GameState),
              endTimes: [
                ...prev.endTimes,
                { id: data.event.client_id, finished: Date.now() },
              ],
            };
          }
        });
      }
    }
  };

  useEffect(() => {
    if (gameState !== null) {
      if (gameState.endTimes.length === connectedUsers.length + 1) {
        setConnectedUsers([]);
        setTaskCount(null);
        setGameState(null);
        setPlayer(null);
        setWebSocket(null);
        navigate("/");
      }
    }
  }, [gameState, connectedUsers]);

  const userJoinDisconnectListener = (
    _: ImprovedWebSocket,
    ev: MessageEvent<any>
  ) => {
    let op = JSON.parse(ev.data).op;
    let data = JSON.parse(ev.data).d;

    if (op === "GameEvent") {
      switch (data.op) {
        case "ConnectedClient":
          setConnectedUsers((users) => [
            ...users,
            { id: data.event.client_id, name: data.event.nickname },
          ]);
          break;
        case "DisconnectedClient":
          setConnectedUsers((users) =>
            users.filter((user) => user.id !== data.event.client_id)
          );
          break;
      }
    }
  };

  const shutdownListener = (_: ImprovedWebSocket, ev: MessageEvent<any>) => {
    let op = JSON.parse(ev.data).op;
    let data = JSON.parse(ev.data).d;

    if (op === "GameEvent" && data.op === "Shutdown") {
      setConnectedUsers([]);
      setTaskCount(null);
      setPlayer(null);
      setGameState(null);
      setWebSocket(null);
      navigate("/");
    }
  };

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={
            <Home
              player={player}
              setPlayer={setPlayer}
              webSocket={webSocket}
              setWebSocket={setWebSocket}
              userJoinDisconnectListener={userJoinDisconnectListener}
              shutdownListener={shutdownListener}
              userFinishedListener={userFinishedListener}
            />
          }
        />
        <Route
          path="/joinGame"
          element={
            <JoinGame
              player={player}
              setPlayer={setPlayer}
              ws={webSocket}
              setTaskCount={setTaskCount}
            />
          }
        />
        <Route
          path="/lobby/:id"
          element={
            <Lobby
              ws={webSocket}
              taskCount={taskCount}
              setTaskCount={setTaskCount}
              player={player}
              connectedUsers={connectedUsers}
              setGameState={setGameState}
            />
          }
        />
        <Route
          path="/game/:id"
          element={
            <Game
              connectedUsers={connectedUsers}
              ws={webSocket}
              taskCount={taskCount as number}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
