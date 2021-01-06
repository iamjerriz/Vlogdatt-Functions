import firebase from "firebase";

var firebaseConfig = {
	apiKey: "AIzaSyAAsb5jhCDlcuWmnDsxsMuwMERLLF-mDnk",
    authDomain: "vlogdat-v2.firebaseapp.com",
    databaseURL: "https://vlogdat-v2.firebaseio.com",
    projectId: "vlogdat-v2",
    storageBucket: "vlogdat-v2.appspot.com",
    messagingSenderId: "224518840349",
    appId: "1:224518840349:web:53afecaff32384fd6226f4",
    measurementId: "G-XK368RSE5R"
};

export const firebaseApp = firebase.initializeApp(firebaseConfig);