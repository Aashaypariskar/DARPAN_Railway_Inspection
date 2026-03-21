import { io } from "socket.io-client";
import { getServerBaseUrl } from "../utils/urlHelper";

let socket;

export const connectSocket = () => {
    if (!socket) {
        const socketUrl = getServerBaseUrl();
        socket = io(socketUrl);
        console.log("Socket connected to:", socketUrl);
    }
    return socket;
};
