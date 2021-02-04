if [ -f ../.env ]
then
  export $(cat ../.env | grep -v SECRET_KEY= | sed 's/#.*//g' | xargs)
fi
docker login -u $DOCKER_HUB_USER -p $DOCKER_HUB_PASSWORD
docker build ../ -f ./containers/chat.Dockerfile -t "${DOCKER_HUB_USER}/${PROJECT_NAME}:chat_${DEPLOY_ENV}" && \
docker push "${DOCKER_HUB_USER}/${PROJECT_NAME}:chat_${DEPLOY_ENV}"