const { admin, db } = require('../util/admin')

const config = require('../util/config')

const firebase = require('firebase');
firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators')
//signup user
exports.signup = (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle
    };

    const { valid, errors } = validateSignupData(newUser);
    if(!valid) return res.status(400).json(errors);

    //addnoimage
    const noImg = 'no-img.png'

    //signup error,token
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({ handle: 'this handle is already taken'});
        } else {
          return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    //access here kaya dito nalagay userId
      .then(data => {
          userId = data.user.uid;
          return data.user.getIdToken();
      })
      .then((idToken) => {
          token = idToken;
          const userCredentials = {
              handle: newUser.handle,
              email: newUser.email,
              createdAt: new Date().toISOString(),
              imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
              userId //same name so ganto n lng
          };
          //writes new user credentials sa dB firestore
          db.doc(`/users/${newUser.handle}`).set(userCredentials);
      })
      .then(() => {
          return res.status(201).json({ token }); //token value is idToken
      })
      .catch(err => {
          console.error(err);
          if( err.code === 'auth/email-already-in-use'){
              return res.status(400).json({ email: 'Email is already in use'});
          } else {
          return res.status(500).json({ general: 'Something went wrong please try again'});
          }
      });
}
//login user
exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const { valid, errors } = validateLoginData(user);
    if(!valid) return res.status(400).json(errors);

    firebase.auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
          return data.user.getIdToken();
      })
        .then(token =>{
          return res.json({ token });
      })
        .catch((err) => {
          console.error(err);
          if(err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
              return res.status(403).json({ general: 'Password or Email is incorrect, please try again'})
          } else
          return res.status(500).json({ error: err.code });
      });
}
//add user details 
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`)
        .update(userDetails)
        .then(() => {
            return res.json({ message: 'Details added succesfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code});
        })
    }

//get any user details
exports.getUserDetails = ( req, res ) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`)
        .get()
        .then((doc) => {
            if(doc.exists) {
                userData.user = doc.data();
                return db
                    .collection('posts').where('userHandle', '==', req.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get();
            }else {
                return res.status(404).json({ error : 'User not found' });
            }
        })
        .then((data) => {
            userData.posts = [];
            data.forEach((doc) => {
                userData.posts.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    postId: doc.id
                });
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })
        })
}

//Get own user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          return db
            .collection("likes")
            .where("userHandle", "==", req.user.handle)
            .get();
        }
      })
      .then((data) => {
        userData.likes = [];
        data.forEach((doc) => {
          userData.likes.push(doc.data());
        });
        return db
          .collection("notifications")
          .where("recipient", "==", req.user.handle)
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();
      })
      .then((data) => {
        userData.notifications = [];
        data.forEach((doc) => {
          userData.notifications.push({
            recipient: doc.data().recipient,
            sender: doc.data().sender,
            createdAt: doc.data().createdAt,
            screamId: doc.data().screamId,
            type: doc.data().type,
            read: doc.data().read,
            notificationId: doc.id,
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };


//using busboy upload image for user
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require ('fs');

    const busboy = new BusBoy({ headers: req.headers});

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file',(fieldname, file, filename, encoding, mimetype) => {
        // console.log(fieldname)
        // console.log(filename)
        // console.log(mimetype)
        //this validates kung png or jpeg
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Wrong file type submitted'})
        }
        //image.png (my.image.png) => need to split by dots    (gets the last name on file or array like png)
        const imageExtension = filename.split('.')[filename.split('.').length -1];
        //example file name is 9281391283123123.png
        imageFileName = `${Math.round(Math.random()*100000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        //above created the file now needs//file system to create this file
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then (() => {
            //needs to add to user in db like a key child
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return res.json({ message: 'Image upload successfully'})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })
        });
    });
    busboy.end(req.rawBody);
};

//notifications read
exports.markNotificationsRead = ( req, res ) => {
    let batch = db.batch(); //batch updates multiple document
    req.body.forEach(notificationId =>{
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, {read: true});
    });
    batch
        .commit()
        .then(() => {
            return res.json({ message: 'Notifications marked red'})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        })
}
