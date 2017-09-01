FROM node:6
MAINTAINER Rogier Slag

EXPOSE 7070

RUN groupadd -r luser && useradd -r -g luser luser
RUN mkdir -p /home/luser/.pm2/
RUN chown -R luser.luser /home/luser
RUN npm install -g pm2

RUN mkdir /service
ADD package.json /service/
RUN cd /service && npm install
ADD index.js /service/

USER luser
WORKDIR /service
CMD ["/usr/local/bin/pm2", "start", "index.js",  "--no-daemon", "--instances=max"]

