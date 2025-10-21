import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  // Function to get all users for sidebar:
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      } else {
        setMessages([]);
        toast.error(data.message || "Failed to load message");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Function to get messages for selected users:
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      console.log("getMessages response: ", data);
      if (data.success) {
        setMessages(Array.isArray(data.messages) ? data.messages : []); // ensure array
      } else {
        setMessages([]);
        toast.error(data.message || "Failed to load messages");
      }
    } catch (error) {
      setMessages([]); // never undefined
      toast.error(error.message);
    }
  };

  // Function to send message to selected users:
  const sendMessage = async (messageData) => {
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        if (data.newMessage && typeof data.newMessage === "object") {
          setMessages((prev) => [
            ...(Array.isArray(prev) ? prev : []),
            data.newMessage,
          ]);
        } else {
          await getMessages(selectedUser._id); // fallback if API didn’t return the object
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to subscribe to messages for selected user
  const subscribeToMessages = async () => {
    if (!socket) return;
    socket.on("newMessage", (newMessage) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          newMessage,
        ]);
        axios.put(`/api/messages/mark/${newMessage._id}`).catch(() => {});
      } else {
        setUnseenMessages((prevUnseenMessages) => ({
          ...(prevUnseenMessages || {}),
          [newMessage.senderId]:
            (prevUnseenMessages?.[newMessage.senderId] || 0) + 1,
        }));
      }
    });
  };

  // Function to unsubscribe from messages:
  const unsubscribeFromMessages = () => {
    if (socket) socket.off("newMessage");
  };

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser]);
  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
