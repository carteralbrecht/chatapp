import React from "react";
import { SafeAreaView, View, StyleSheet, Text, FlatList, VirtualizedList, StatusBar, Button } from "react-native";
import AddMessage from "../components/AddMessage";
import ChatLog from "../components/ChatLog";
import Header from "../components/Header";

import { AutoScrollFlatList } from "react-native-autoscroll-flatlist";

import Client from '../client.js';
import config from '../config';
const io = require("socket.io-client");

class MessageScreen extends React.Component {
  constructor(props) {
    super(props);
    const params = this.props.route.params;
    this.state = {
      accessToken: params.accessToken,
      room: params.room,
      userId: params.userId,
      nickName: params.nickName,
      name: '',
      chat: [],
    };

    this.client = new Client('https://cop4331-chatapp.herokuapp.com');

    if (this.state.accessToken) {
      this.client.setAccessToken(this.state.accessToken);
    } else {
      // User needs to login
      this.props.navigation.navigate('Login');
    }
  }

  async componentDidMount() {
    this.socket = io('https://cop4331-chatapp.herokuapp.com');

    this.socket.on('connect', async () => {
      if (this.state.room) {
        await this.handleJoinRoom(this.state.room);
      } else {
        this.props.navigation.navigate('Login');
      }
    });

    this.socket.on('messageError', (err) => {
      console.log(err);
    });

    // Update the chat if a new message is broadcasted.
    this.socket.on('push', (msg) => {
      this.setState((state) => ({
        chat: [...state.chat, msg],
      }));
    });
  }

  // Call this when the user wants to go back to dashboard
  async handleLeaveRoom() {
    const room = this.state.room;
    if (!room) {
      return this.props.navigation.navigate('Login');
    }

    console.log('leaving ', room._id);

    const accessToken = this.client.getAccessToken();
    const response = await this.client.leaveRoom(room._id);
    if (response.err) {
      return console.log(response.err);
    }

    this.socket.emit('leaveRoom', accessToken);

    this.setState({ room: {}, chat: []});

    console.log('Leave room successful');

    this.props.navigation.navigate('Dashboard');
  }

  async handleJoinRoom(room) {
    const accessToken = this.client.getAccessToken();
    const response = await this.client.joinRoom(room._id);
    if (response.err) {
      return console.log(response.err);
    }

    this.socket.emit('joinRoom', accessToken);

    console.log('Join room successful');

    const {name, messages} = room;
    this.setState((state) => ({
      name,
      chat: [...state.chat, ...messages]
    }), this.scrollToBottom);
  }

  async submitHandler(content) {
    const accessToken = await this.client.getAccessToken();
    
    this.socket.emit('message', {
      accessToken,
      content
    });
  };

  render() {
    return (
      <SafeAreaView style={styles.background}>
        <View style={styles.fixToText}>
          <Button
            title="Back"
            color="#fff"
            onPress={async () => await this.handleLeaveRoom()}
          />
          <Header title={this.state.name}/>
          <Button
            title="Log Out"
            color="#fff"
            onPress={() => this.props.navigation.navigate("Login")}
          />
        </View>
        <AutoScrollFlatList
          style={styles.messageBlock}
          data={this.state.chat}
          renderItem={({ item }) => (
            <ChatLog key={item._id} content={item.content} nickname={item.name} isSelf={item.userId === this.state.userId} />
          )}
        />
        <AddMessage submitHandler={this.submitHandler.bind(this)} />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  statusbar: {
    backgroundColor: "#5102A1",
    height: 34
  },

  fixToText: {
    flexDirection: 'row',
    backgroundColor: "#5102A1",
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 10
  },

  topBar: {
    backgroundColor: "#5102A1",
    flexDirection: "row",
    flex: 0.1,
    justifyContent: "flex-start",
    alignItems: "center",
  },

  topText: {
    color: "white",
    fontSize: 25,
    marginLeft: 10,
  },

  messageBlock: {
    padding: 10,
    backgroundColor: "#303030"
  },

  background: {
    flex: 1,
    backgroundColor: "#5102A1",
  },
});

export default MessageScreen;
