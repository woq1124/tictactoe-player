library identifier: 'pipeline-library', changelog: false

worker('worker-tictactoe-player-build') {
    def namespace = 'tictactoe-player'
    def deployment = 'tictactoe-player'
    def imageName = 'tictactoe-player'
    def commitHash = it.GIT_COMMIT

    stage('Test') {
        echo 'Running tests...'
    }

    stage('Build') {
        container('docker') {
            dockerBuild(
                ['name' : imageName, 'tag': commitHash.substring(0, 6)],
                ['NODE_ENV' : env.NODE_ENV, 'COMMIT_HASH' : commitHash],
                '.',
            )
        }
    }

    stage('Deploy') {
        container('kubectl') {
            deploy(deployment, namespace)
        }
    }
}
