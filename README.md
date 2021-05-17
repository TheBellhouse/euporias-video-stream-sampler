# euporias-video-stream-sampler
euporias - ceramic bell project - video stream sampler

## installation
(Use nvm to install / manage node versions)

- `nvm install stable`
- `npm i -g gulp`
- `cd <your git repo>`
- `npm install`

## running

- `nvm use`
- `gulp serve`

## usage
To start sampling click the large green 'Start Sampling' button.
To stop sampling click the large red 'Stop Sampling' button.

After each frame, global `sample` object contains `diff` property: An array (in same order as cells) specifying the mean of all pixels in that cell differenced against the previous frame. Negative value indicates cell pixels have become darker, Positive value indicates cell pixels have become lighter.
If a cell has changed significantly enough (controllable via the 'Sampling Threshold' toggle) the cells index is added to the array that is posted to the bell sever.

To initiate a server recording of the sampling requests use the 'Start Recording' button.  
When prompted use a unique name for your recording.

To stop the server recording use the 'Stop Recording' button.

After each frame, global `sample` object contains `diff` property: An array (in same order as cells) specifying the sum of all pixels in that cell differenced against the previous frame. Negative value indicates cell pixels have become darker, Positive value indicates cell pixels have become lighter.

For more information on the server app see the server README 

## release
[Hosted on github pages](https://thebellhouse.github.io/config)

- `gulp build`
- `git checkout gh-pages`
- `cp -r build/* .`
- `git push origin gh-pages`
