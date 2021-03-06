import React, {Component} from "react";
import config from '../../config';
import io from 'socket.io-client';
import {
  AppBar,
  Button,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  MuiThemeProvider,
  Paper,
  Slide,
  TextField,
  Toolbar,
  Typography
} from "@material-ui/core";
import {createMuiTheme, withStyles} from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import CloseIcon from "@material-ui/icons/Close";
import FaceIcon from "@material-ui/icons/Face";
import SearchIcon from "@material-ui/icons/Search";
import SearchBar from "material-ui-search-bar";
import AddIcon from "@material-ui/icons/Add";
import {withOktaAuth} from '@okta/okta-react';
import BottomBar from '../chat/bottomBar.jsx';
import './dashboard.css';
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Chat from "../chat/chat";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardActions from "@material-ui/core/CardActions";
import CardHeader from "@material-ui/core/CardHeader";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

const useStyles = theme => ({
  root: {
    // Styles for each appended card
    minWidth: 275,
    maxWidth: 10,
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(1)
  },
  // Style for the name of the chat on the card
  chatName: {
    color: "default"
  },
  chatDescription: {
    color: "black",
    fontSize: 15
  },
  appBar: {
    position: "relative"
  },
  appBarTitle: {
    marginLeft: theme.spacing(3),
    flex: 1
  },
  dashboardText: {
    display: "flex",
    align: "center",
    margin: "auto",
    flexGrow: 1,
    justifyContent: "center",
    color: "white"
  },
  profileButton: {
    // styles for the profile button that will take the user to a profile modal
    color: "white",
    marginTop: theme.spacing(-12)
  },
  searchButton: {
    // Styles for the search button that will redirect to explore page
    color: "white",
    marginTop: theme.spacing(-12)
  },
  logOutButton: {
    // Styles for logout button
    color: "whitesmoke",
    marginTop: theme.spacing(-12),
    fontSize: 30,
    backgroundColor: "grey",
    marginLeft: theme.spacing(190),
    alignSelf: "right",
    flex: 1,
    justifyContent: "right"
  },
  profileModal: {
    position: "absolute",
    width: 400,
    backgroundColor: "grey",
    border: "2px",
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
    margin: 'auto',
    marginTop: theme.spacing(-20)
  },
  newChatButton: {
    color: "white",
    marginTop: theme.spacing(-12),
    marginLeft: theme.spacing(140),
    float: "right",
  }
});

class Dashboard extends Component {
  constructor(props) {
    super(props);

    const top = 50;
    const left = 50;

    this.modalStyle = {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`
    }

    this.state = {
      chat: [],
      content: '',
      searchQuery: '',
      queryResults: [],
      rooms: [],
      userInfo: {},
      createRoomInfo: {
        privateChecked: false,
        tags: [],
        name: ''
      },
      chatOpen: false,
      profileOpen: false,
      searchOpen: false,
      createRoomOpen: false,
      removeConfirmOpen: false,
      roomToRemove: ''
    }

    this.checkUser = this.checkUser.bind(this);
    this.updateRooms = this.updateRooms.bind(this);

    this.handleProfileOpen = this.handleProfileOpen.bind(this);
    this.handleProfileClose = this.handleProfileClose.bind(this);

    this.handleCreateRoomOpen = this.handleCreateRoomOpen.bind(this);
    this.handleCreateRoomClose = this.handleCreateRoomClose.bind(this);

    this.handleChatOpen = this.handleChatOpen.bind(this);
    this.handleChatClose = this.handleChatClose.bind(this);

    this.handleRemoveConfirmOpen = this.handleRemoveConfirmOpen.bind(this);
    this.handleRemoveConfirmClose = this.handleRemoveConfirmClose.bind(this);

    this.handleSearchOpen = this.handleSearchOpen.bind(this);
    this.handleSearchClose = this.handleSearchClose.bind(this);

    this.handleChange = this.handleChange.bind(this);

    this.handleProfileUpdate = this.handleProfileUpdate.bind(this);

    this.handleCreateRoom = this.handleCreateRoom.bind(this);
    this.handleCreateRoomChange = this.handleCreateRoomChange.bind(this);

    this.handlePrivateCheckboxChange = this.handlePrivateCheckboxChange.bind(this);
  }

  async checkUser() {
    if (this.props.authState.isAuthenticated) {
      const userInfo = await this.props.authService.getUser();

      // Temporary cant figure out okta mappings from okta -> user
      // Server -> okta mappings are fine and dont need to be tweaked
      userInfo.nickName = userInfo.nickname;
      userInfo.firstName = userInfo.given_name;
      userInfo.lastName = userInfo.family_name;

      this.setState({ userInfo });
    }
  }

  async updateRooms() {
    const accessToken = await this.props.authService.getAccessToken();
    const response = await fetch('/api/rooms', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const rooms = await response.json();
    this.setState(rooms)
  }

  async handleProfileUpdate() {
    const accessToken = await this.props.authService.getAccessToken();
    const response = await fetch('/api/users/updateProfile', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(this.state)
    });

    if (response.ok) {
      this.setState({ profileOpen: false });
    } else {
      this.setState({ profileError: 'Error updating profile'});
    }
  }

  async componentDidMount() {
    this._isMounted = true;
    await this.checkUser();
    await this.updateRooms();

    this.socket = io(config[process.env.NODE_ENV].endpoint);
  }

  async handleLeaveRoom(roomId) {
    const accessToken = await this.props.authService.getAccessToken();

    this.socket.emit('leaveRoom', accessToken);

    const response = await fetch(`/api/rooms/leave/${roomId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    this.setState({ activeRoom: '', chat: []});
  }

  async handleCreateRoom() {
    const nameOfRoom = this.state.createRoomInfo.name;
    const tags = [];
    const isPrivate = this.state.createRoomInfo.privateChecked;
    tags.push(this.state.createRoomInfo.tags);
    const accessToken = await this.props.authService.getAccessToken();
    const response = await fetch(`/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({name: nameOfRoom, tags: tags, private: isPrivate})
    });

    await this.updateRooms();
  }

  async handleJoinRoom(roomId) {

    // Leave old room before joining new
    if (this.state.activeRoom) {
      await this.handleLeaveRoom(roomId);
    }

    const accessToken = await this.props.authService.getAccessToken();
    const response = await fetch(`/api/rooms/join/${roomId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    this.socket.emit('joinRoom', accessToken);
    this.setState({ activeRoom: roomId });
    this.handleChatOpen()
  }

  async handleAddRoom(roomId) {
    const accessToken = await this.props.authService.getAccessToken();
    const response = await fetch(`/api/rooms/add/${roomId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }

  // Save the message the user is typing in the input field.
  handleContent(event) {
    this.setState({
      content: event.target.value,
    });
  }

  handlePrivateCheckboxChange(event, checked) {
    const newState = this.state.createRoomInfo;
    newState.privateChecked = checked;

    this.setState({ createRoomInfo: newState });
  };

  handleCreateRoomChange(event) {
    const newState = this.state.createRoomInfo;
    const { name, value } = event.target;
    newState[name] = value;

    this.setState({ createRoomInfo: newState });
  }

  // Save the query the user is typing in the search input field
  handleSearchInput(event) {
    this.setState({
      searchInput: event.target.value,
    });
  }

  async handleRemoveRoom() {
    const roomToRemove = this.state.roomToRemove;
    const accessToken = await this.props.authService.getAccessToken();
    const response = await fetch(`/api/rooms/remove/${roomToRemove}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    await this.updateRooms();
    this.setState({roomToRemove: ''});
  }

  async handleSubmit(event) {
    // Prevent the form to reload the current page.
    event.preventDefault();

    const accessToken = await this.props.authService.getAccessToken();
    const content = this.state.content;

    // Send the new message to the server.
    this.socket.emit('message', {
      accessToken,
      content
    });

    this.setState({content: ''});
  }

  async handleSearchSubmit() {
    const accessToken = await this.props.authService.getAccessToken();
    const tags = [];
    const tagLookingFor = this.state.searchInput;

    //https://stackoverflow.com/questions/44374267/mongoose-return-document-if-a-search-string-is-in-an-array
    tags.push(tagLookingFor);

    const response = await fetch(`/api/rooms/tags`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        tags: tags
      })
    });

    const rooms = await response.json();
    this.setState({queryResults: rooms})
    this.setState({ searchInput: ''});
  }

  handleProfileOpen = () => this.setState({ profileOpen: true, profileError: '' });
  handleProfileClose = () => this.setState({ profileOpen: false });

  handleCreateRoomOpen = () => this.setState({createRoomOpen: true});
  handleCreateRoomClose = () => this.setState({createRoomOpen: false});

  handleRemoveConfirmOpen = function(roomId) {
    this.setState({roomToRemove: roomId});
    this.setState({removeConfirmOpen: true});

  };

  handleRemoveConfirmClose = function() {
    this.setState({removeConfirmOpen: false});
    this.setState({roomToRemove: ''})
  };

  handleChatOpen = () => this.setState({ chatOpen: true });

  handleChatClose = function()
  {
    this.setState({chatOpen: false});
    this.handleLeaveRoom(this.state.activeRoom);
  }

  handleSearchOpen = () => this.setState({ searchOpen: true });
  handleSearchClose = () => {
    this.setState({ searchOpen: false });
    this.setState({ queryResults: []});
  }

  handleChange(e) {
    const userInfo = this.state.userInfo;
    const currentState = userInfo;
    const { name, value } = e.target;
    currentState[name] = value;

    this.setState({ userInfo: currentState });
  }

  render() {
    const { classes } = this.props;

    // Controls the theme of the page itself behind all elements
    const pageTheme = createMuiTheme({
      palette: {
        background: {
          default: "#303030" // darker grey color for background
        }
      }
    });

    return (
      <MuiThemeProvider theme={pageTheme}>
        <CssBaseline />
        <Grid container spacing={5} justify="center" style={{marginTop: '2rem', height: "100%"}}>
          <Grid item xs={12}>
            <Typography
              display="inline"
              name="DashboardText"
              variant="h2"
              className={classes.dashboardText}
            >
              Dashboard
            </Typography>

            <IconButton
              className={classes.profileButton}
              onClick={this.handleProfileOpen}
            >
              <FaceIcon display="inline" style={{ fontSize: '4rem' }} />
            </IconButton>

            <IconButton
              className={classes.searchButton}
              onClick={this.handleSearchOpen}
            >
              <SearchIcon display="inline" style={{ fontSize: '4rem' }} />
            </IconButton>
            <IconButton
                className={classes.newChatButton}
                onClick={this.handleCreateRoomOpen}
                justify="flex-end"
            >
            <AddIcon display="inline" style={{fontSize: '4rem'}} />
            </IconButton>
          </Grid>
              <Grid container
                    spacing={5}
                    style={{margin: '2rem', height: "100%", justifyContent: "center"}}
                    direction="row"
                    justify="center"
                    alignItems="center">
                {this.state.rooms.map((room) => (
                    <Grid item xs={6} sm={3} >
                      <Card>
                        <CardHeader
                            title={room.name}
                            titleTypographyProps={{variant:'h6' }}
                            style={{ textAlign: "center" }}
                        >
                        </CardHeader>
                        <CardActions style={{ justifyContent: "center" }}>
                          <Button
                              variant="contained"
                              color="primary"
                              type="button"
                              onClick={() => this.handleJoinRoom(room._id)}
                          >
                            Join
                          </Button>
                          <Button
                              variant = "contained"
                              style={{backgroundColor: "#E83F1B", color: "white"}}
                              type="button"
                              onClick={() => this.handleRemoveConfirmOpen(room._id)}
                          >
                            Remove
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                ))}
              </Grid>
        </Grid>
        <Dialog open={this.state.removeConfirmOpen} onClose={this.handleRemoveConfirmClose} aria-labelledby="form-dialog-title">
          <DialogContent style={{ justifyContent: "center" }}>
            <Typography>Are you sure you want to remove?</Typography>
          </DialogContent>
          <DialogActions style={{ justifyContent: "center" }}>
            <Button
                variant="contained"
                color="primary"
                type="button"
                style={{backgroundColor: "#e83f1b", color: "white"}}
                onClick={() => this.handleRemoveConfirmClose()}
            >
              Cancel
            </Button>
            <Button
                variant = "contained"
                type="button"
                onClick={() => {
                  this.handleRemoveRoom()
                      .then(r => this.handleRemoveConfirmClose())
                      .then(r => this.updateRooms());
                }}
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={this.state.profileOpen} onClose={this.handleProfileClose} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">
          <Grid container spacing={2} direction="row" alignItems="center">
            <Grid item>
              <FaceIcon style={{fontSize: '4rem'}}/>
            </Grid>
            <Grid item>
              Edit Profile
            </Grid>
          </Grid>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="nickName"
              label="Nickname"
              type="text"
              value={this.state.userInfo.nickName}
              onChange={this.handleChange}
              fullWidth
            />

            <TextField
              autoFocus
              margin="dense"
              name="firstName"
              label="First Name"
              type="text"
              value={this.state.userInfo.firstName}
              onChange={this.handleChange}
              fullWidth
            />

            <TextField
              autoFocus
              margin="dense"
              name="lastName"
              label="Last Name"
              type="text"
              value={this.state.userInfo.lastName}
              onChange={this.handleChange}
              fullWidth
            />

            <Typography>{this.state.profileError}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleProfileClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={this.handleProfileUpdate} color="primary">
              Update
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={this.state.searchOpen} onClose={this.handleSearchClose} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Search for rooms using tags
            </DialogContentText>
            <SearchBar
              value={this.state.value}
              onChange={(newValue) => this.setState({searchInput: newValue})}
              onRequestSearch={this.handleSearchSubmit.bind(this)}
            />
          </DialogContent>
          <Grid container spacing={5} justify="center" align="center">
            <Grid item>
              {this.state.queryResults.map((room) => (
                  <Grid item xs={200}>
                    <Typography>{room.name}</Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      type="button"
                      onClick={() => {
                        this.handleAddRoom(room._id)
                            .then(r => this.updateRooms())
                            .then(r => this.handleSearchClose());
                      }}
                      >
                      Add Room
                    </Button>
                  </Grid>
              ))}
            </Grid>
          </Grid>
          <DialogActions>
            <Button onClick={this.handleSearchClose} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={this.state.createRoomOpen} onClose={this.handleCreateRoomClose} aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title">
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Create a Room
            </DialogContentText>
            <TextField
                margin="dense"
                name="name"
                label="Room Name"
                type="text"
                value={this.state.createRoomInfo.name}
                onChange={this.handleCreateRoomChange}
                fullWidth
            />
            <TextField
                margin="dense"
                name="tags"
                label="Room Tags"
                type="text"
                value={this.state.createRoomInfo.tags}
                onChange={this.handleCreateRoomChange}
                fullWidth
            />
            <FormControlLabel
              control ={
                <Checkbox
                    checked={this.state.createRoomInfo.privateChecked}
                    onChange={this.handlePrivateCheckboxChange}
                    name="privateChecked"
                    color="primary"
                />
              }
              label="Private"
              />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCreateRoomClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={() => {
              this.handleCreateRoom()
                  .then(r => this.updateRooms())
                  .then(r => this.handleCreateRoomClose());
            }}>
              Create
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          fullScreen
          open={this.state.chatOpen}
          onClose={this.handleChatClose}
          TransitionComponent={Transition}
        >
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton edge="end" color="inherit" onClick={this.handleChatClose}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
          <Chat
            socket={this.socket}
            nickname={this.state.userInfo.nickName}
          />
        </Dialog>
      </MuiThemeProvider>
    );
  }
}

export default withOktaAuth(withStyles(useStyles)(Dashboard));
