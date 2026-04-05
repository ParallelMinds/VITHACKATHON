import numpy as np
from sklearn.neighbors import NearestNeighbors

class AnomalyDetector:

    def __init__(self, feature_path):

        self.features = np.load(feature_path)

        self.knn = NearestNeighbors(n_neighbors=5)
        self.knn.fit(self.features)

    def compute_score(self, feature):

        distances, _ = self.knn.kneighbors([feature])

        score = distances.mean()

        return score